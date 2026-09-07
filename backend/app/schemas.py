from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ---- LLM structured output (grounded triage assessment) ----

class KeyDriver(BaseModel):
    signal: str = Field(description="Exact column name of the signal being cited")
    value: str = Field(description="The signal's actual value for this case, as given")
    rationale: str = Field(description="One sentence on why this value matters for fraud risk")


class TriageAssessment(BaseModel):
    risk_level: Literal["High", "Medium", "Low"]
    confidence: Literal["High", "Medium", "Low"] = Field(
        description="Lower this when triggered signals are few, weak, or conflicting"
    )
    risk_overview: str = Field(description="2-3 sentence plain-English summary for a busy investigator")
    key_drivers: list[KeyDriver] = Field(description="1-4 signals that most drove the assessment")
    recommended_next_step: str = Field(description="A concrete, specific next action")


class TriageResultItem(TriageAssessment):
    case_id: str = Field(description="Must exactly match one of the case_id values given in the input")


class BatchTriageResponse(BaseModel):
    results: list[TriageResultItem] = Field(
        description="Exactly one result per case given in the input, tagged with its case_id"
    )


# ---- API request/response models ----

class CaseListItem(BaseModel):
    case_id: str
    claim_number: str
    claim_date: str
    care_type: str
    claim_amount_usd: float
    state: str
    risk_level: Optional[str]
    confidence: Optional[str]
    review_status: str

    class Config:
        from_attributes = True


class CaseDetail(CaseListItem):
    duplicate_service_billed: int
    weekly_visit_frequency: int
    member_provider_distance_miles: float
    prior_claims_last_12mo: int
    shared_contact_with_provider: int
    weekend_billing_ratio: float
    amount_vs_peer_avg_pct: float
    round_dollar_billing_ratio: float
    recent_policy_change_flag: int
    service_overlap_other_provider: int

    risk_overview: Optional[str]
    key_drivers: Optional[list[dict]]
    recommended_next_step: Optional[str]
    investigator_notes: Optional[str]
    reviewed_at: Optional[datetime]

    class Config:
        from_attributes = True


class DecisionRequest(BaseModel):
    status: Optional[Literal["Escalated", "Dismissed"]] = None
    notes: Optional[str] = None


class ChatMessageOut(BaseModel):
    role: Literal["human", "ai"]
    content: str


class ChatRequest(BaseModel):
    message: str
