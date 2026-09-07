from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import BaseMessage

from app.config import GEMINI_API_KEY
from app.models import Claim
from app.schemas import TriageAssessment, BatchTriageResponse

SIGNAL_FIELDS = [
    "duplicate_service_billed",
    "weekly_visit_frequency",
    "member_provider_distance_miles",
    "prior_claims_last_12mo",
    "shared_contact_with_provider",
    "weekend_billing_ratio",
    "amount_vs_peer_avg_pct",
    "round_dollar_billing_ratio",
    "recent_policy_change_flag",
    "service_overlap_other_provider",
]


def case_context(claim: Claim) -> str:

    lines = [
        f"case_id: {claim.case_id}",
        f"claim_number: {claim.claim_number}",
        f"claim_date: {claim.claim_date}",
        f"care_type: {claim.care_type}",
        f"claim_amount_usd: {claim.claim_amount_usd}",
        f"state: {claim.state}",
    ]
    for field in SIGNAL_FIELDS:
        lines.append(f"{field}: {getattr(claim, field)}")
    return "\n".join(lines)


SYSTEM_PROMPT = """You are a Senior Fraud Investigator (SIU) reviewing insurance claims.

You will be given exactly 16 data fields for one claim: 6 metadata fields and 10 fraud
signal fields. A signal value of 0 (or 0.0) means "not triggered" / normal.

Rules you must follow:
- Base your reasoning ONLY on the fields given to you. Never invent, assume, or reference
  any fact, provider name, member name, or history that is not literally present in the
  data given.
- Every key driver you cite MUST reference one of the exact field names given and its
  actual value for this case.
- If few signals are triggered, or the triggered signals are weak or contradict each
  other (e.g. one strong red flag but everything else looks clean), you must lower your
  confidence level and say so plainly in the overview. Do not project false certainty.
- Be concise and scannable. The reader is a busy human investigator, not another AI.
"""

TRIAGE_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        (
            "human",
            "Here is the claim data:\n\n{case_data}\n\n"
            "Produce a risk_level, confidence, risk_overview, key_drivers, and "
            "recommended_next_step for this claim.",
        ),
    ]
)

BATCH_TRIAGE_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        (
            "human",
            "Here are {n_cases} claims, each separated by a header line with its case_id:\n\n"
            "{batch_data}\n\n"
            "Produce one assessment per claim above (risk_level, confidence, risk_overview, "
            "key_drivers, recommended_next_step), each tagged with its exact case_id, in the "
            "`results` array. Return exactly {n_cases} results, one per case_id given, with no "
            "duplicates and no omissions.",
        ),
    ]
)

CHAT_SYSTEM_PROMPT = SYSTEM_PROMPT + (
    "\nYou are now answering a follow-up question from the investigator about this "
    "specific claim, in a chat window (not a report). Follow these formatting rules "
    "strictly:\n"
    "- Answer ONLY the question asked. Do not restate or list all 16 fields unless the "
    "investigator explicitly asks for a full breakdown of every field.\n"
    "- Default to 2-5 short sentences or a handful of tight bullet points. Only go longer "
    "if the question genuinely requires it.\n"
    "- Cite specific field names and values inline as evidence (e.g. "
    "\"weekend_billing_ratio is 0.11, which is low\"), not as a separate labeled section.\n"
    "- Use light Markdown only: short bullet lists and **bold** for a field name or key "
    "number. Never use headers (#), horizontal rules (---), or nested sub-sections.\n"
    "- Write like a knowledgeable colleague replying in chat: plain, direct, and friendly "
    "in tone, not like a formal audit report.\n"
    "- Ground everything strictly in the claim data below. If the investigator asks "
    "something the data cannot answer, say so plainly in one sentence instead of guessing."
)

CHAT_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", CHAT_SYSTEM_PROMPT),
        ("system", "Claim data:\n\n{case_data}"),
        MessagesPlaceholder("history"),
        ("human", "{question}"),
    ]
)

def _llm(schema=None):
    model = ChatGoogleGenerativeAI(
        model="gemini-3.6-flash",
        temperature=0,
        google_api_key=GEMINI_API_KEY,
        max_retries=1,  # fail fast on quota errors instead of long exponential backoff
    )
    if schema:
        return model.with_structured_output(schema)
    return model


def chat_chain():
    return CHAT_PROMPT | _llm()


def batch_triage_chain():
    return BATCH_TRIAGE_PROMPT | _llm(schema=BatchTriageResponse)


async def triage_batch(claims: list[Claim]) -> dict[str, TriageAssessment]:
    """One LLM call scores many claims at once, to stay well under free-tier daily quotas."""
    batch_data = "\n\n".join(f"=== case_id: {c.case_id} ===\n{case_context(c)}" for c in claims)
    chain = batch_triage_chain()
    response: BatchTriageResponse = await chain.ainvoke(
        {"n_cases": len(claims), "batch_data": batch_data}
    )
    return {item.case_id: item for item in response.results}


async def answer_chat(claim: Claim, history: list[BaseMessage], question: str) -> str:
    chain = chat_chain()
    result = await chain.ainvoke(
        {"case_data": case_context(claim), "history": history, "question": question}
    )
    return result.text
