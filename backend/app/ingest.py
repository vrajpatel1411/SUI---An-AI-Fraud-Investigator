"""
Loads sample_cases_synthetic.csv into Postgres and runs the grounded LLM triage
chain over any case that doesn't already have a risk_level. Idempotent: already
triaged cases are skipped, so re-running (including on every app startup) does
not re-burn LLM calls.
"""
import csv
from pathlib import Path

from app.db import Base, engine, SessionLocal
from app.models import Claim
from app.ai import triage_batch

CSV_PATH = Path(__file__).resolve().parent.parent.parent / "sample_cases_synthetic.csv"

INT_FIELDS = {
    "duplicate_service_billed",
    "weekly_visit_frequency",
    "prior_claims_last_12mo",
    "shared_contact_with_provider",
    "recent_policy_change_flag",
    "service_overlap_other_provider",
}
FLOAT_FIELDS = {
    "claim_amount_usd",
    "member_provider_distance_miles",
    "weekend_billing_ratio",
    "amount_vs_peer_avg_pct",
    "round_dollar_billing_ratio",
}


def load_csv_rows() -> list[dict]:
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def upsert_metadata(db, rows: list[dict]) -> None:
    existing_ids = {c.case_id for c in db.query(Claim.case_id).all()}
    for row in rows:
        if row["case_id"] in existing_ids:
            continue
        kwargs = {}
        for key, value in row.items():
            if key in INT_FIELDS:
                kwargs[key] = int(value)
            elif key in FLOAT_FIELDS:
                kwargs[key] = float(value)
            else:
                kwargs[key] = value
        db.add(Claim(**kwargs))
    db.commit()


def _chunks(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


async def triage_untriaged(db, batch_size: int = 10) -> None:
    pending = db.query(Claim).filter(Claim.risk_level.is_(None)).all()
    if not pending:
        print("[ingest] All cases already triaged. Nothing to do.")
        return

    batches = list(_chunks(pending, batch_size))
    print(f"[ingest] Triaging {len(pending)} case(s) in {len(batches)} batch call(s) of up to {batch_size}...")
    succeeded = 0
    failed = 0

    for batch in batches:
        try:
            results = await triage_batch(batch)
        except Exception as e:
            failed += len(batch)
            print(f"[ingest]   batch of {len(batch)} FAILED ({e.__class__.__name__}: {e})")
            continue

        for claim in batch:
            assessment = results.get(claim.case_id)
            if assessment is None:
                failed += 1
                print(f"[ingest]   {claim.case_id}: MISSING from batch response")
                continue
            claim.risk_level = assessment.risk_level
            claim.confidence = assessment.confidence
            claim.risk_overview = assessment.risk_overview
            claim.key_drivers = [d.model_dump() for d in assessment.key_drivers]
            claim.recommended_next_step = assessment.recommended_next_step
            succeeded += 1
            print(f"[ingest]   {claim.case_id}: {assessment.risk_level} risk / {assessment.confidence} confidence")
        db.commit()

    print(f"[ingest] Triage pass complete: {succeeded} succeeded, {failed} failed/pending.")
    if failed:
        print("[ingest] Re-run this script later to retry the remaining cases (already-triaged ones are skipped).")


async def run() -> None:
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        rows = load_csv_rows()
        upsert_metadata(db, rows)
        await triage_untriaged(db)
    finally:
        db.close()
