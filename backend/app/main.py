from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage, AIMessage
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Claim
from app.schemas import CaseListItem, CaseDetail, DecisionRequest, ChatMessageOut, ChatRequest
from app.ai import answer_chat
from app.chat_history import ensure_chat_tables, get_chat_history
from app import ingest


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_chat_tables()
    await ingest.run()
    yield


app = FastAPI(title="Junior AI Investigator API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/cases", response_model=list[CaseListItem])
def list_cases(
    risk_level: Optional[str] = Query(None),
    care_type: Optional[str] = Query(None),
    review_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Claim)
    if risk_level:
        q = q.filter(Claim.risk_level == risk_level)
    if care_type:
        q = q.filter(Claim.care_type == care_type)
    if review_status:
        q = q.filter(Claim.review_status == review_status)
    return q.order_by(Claim.case_id).all()


@app.get("/api/cases/{case_id}", response_model=CaseDetail)
def get_case(case_id: str, db: Session = Depends(get_db)):
    claim = db.get(Claim, case_id)
    if not claim:
        raise HTTPException(404, "Case not found")
    return claim


@app.post("/api/cases/{case_id}/decision", response_model=CaseDetail)
def submit_decision(case_id: str, decision: DecisionRequest, db: Session = Depends(get_db)):
    claim = db.get(Claim, case_id)
    if not claim:
        raise HTTPException(404, "Case not found")
    if decision.status is not None:
        claim.review_status = decision.status
        claim.reviewed_at = datetime.now(timezone.utc)
    if decision.notes is not None:
        claim.investigator_notes = decision.notes
    db.commit()
    db.refresh(claim)
    return claim


@app.get("/api/cases/{case_id}/chat", response_model=list[ChatMessageOut])
def get_chat(case_id: str, db: Session = Depends(get_db)):
    if not db.get(Claim, case_id):
        raise HTTPException(404, "Case not found")
    history = get_chat_history(case_id)
    return [
        ChatMessageOut(role="human" if isinstance(m, HumanMessage) else "ai", content=m.text)
        for m in history.messages
    ]


@app.post("/api/cases/{case_id}/chat", response_model=ChatMessageOut)
async def post_chat(case_id: str, req: ChatRequest, db: Session = Depends(get_db)):
    claim = db.get(Claim, case_id)
    if not claim:
        raise HTTPException(404, "Case not found")

    history = get_chat_history(case_id)
    answer = await answer_chat(claim, history.messages, req.message)

    history.add_messages([HumanMessage(content=req.message), AIMessage(content=answer)])
    return ChatMessageOut(role="ai", content=answer)
