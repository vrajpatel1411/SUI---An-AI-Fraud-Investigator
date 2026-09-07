export type RiskLevel = "High" | "Medium" | "Low";
export type Confidence = "High" | "Medium" | "Low";
export type ReviewStatus = "Pending Review" | "Escalated" | "Dismissed";

export interface CaseListItem {
  case_id: string;
  claim_number: string;
  claim_date: string;
  care_type: string;
  claim_amount_usd: number;
  state: string;
  risk_level: RiskLevel | null;
  confidence: Confidence | null;
  review_status: ReviewStatus;
}

export interface KeyDriver {
  signal: string;
  value: string;
  rationale: string;
}

export interface CaseDetail extends CaseListItem {
  duplicate_service_billed: number;
  weekly_visit_frequency: number;
  member_provider_distance_miles: number;
  prior_claims_last_12mo: number;
  shared_contact_with_provider: number;
  weekend_billing_ratio: number;
  amount_vs_peer_avg_pct: number;
  round_dollar_billing_ratio: number;
  recent_policy_change_flag: number;
  service_overlap_other_provider: number;

  risk_overview: string | null;
  key_drivers: KeyDriver[] | null;
  recommended_next_step: string | null;
  investigator_notes: string | null;
  reviewed_at: string | null;
}

export interface ChatMessage {
  role: "human" | "ai";
  content: string;
}
