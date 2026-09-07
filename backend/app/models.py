from sqlalchemy import Column, String, Integer, Float, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db import Base


class Claim(Base):
    __tablename__ = "claims"

    # Metadata
    case_id = Column(String, primary_key=True)
    claim_number = Column(String, nullable=False)
    claim_date = Column(String, nullable=False)
    care_type = Column(String, nullable=False)
    claim_amount_usd = Column(Float, nullable=False)
    state = Column(String, nullable=False)

    # Signals (raw, from CSV)
    duplicate_service_billed = Column(Integer, default=0)
    weekly_visit_frequency = Column(Integer, default=0)
    member_provider_distance_miles = Column(Float, default=0)
    prior_claims_last_12mo = Column(Integer, default=0)
    shared_contact_with_provider = Column(Integer, default=0)
    weekend_billing_ratio = Column(Float, default=0)
    amount_vs_peer_avg_pct = Column(Float, default=0)
    round_dollar_billing_ratio = Column(Float, default=0)
    recent_policy_change_flag = Column(Integer, default=0)
    service_overlap_other_provider = Column(Integer, default=0)

    # AI triage (null until ingestion runs the model on this row)
    risk_level = Column(String, nullable=True)  # High / Medium / Low
    confidence = Column(String, nullable=True)  # High / Medium / Low
    risk_overview = Column(String, nullable=True)
    key_drivers = Column(JSONB, nullable=True)  # list[{signal, value, rationale}]
    recommended_next_step = Column(String, nullable=True)

    # Workflow state
    review_status = Column(String, default="Pending Review", nullable=False)
    investigator_notes = Column(String, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
