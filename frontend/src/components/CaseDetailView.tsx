import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, ShieldAlert, Sparkles, TriangleAlert, XCircle } from "lucide-react";
import { getCase, submitDecision, saveNotes } from "../api";
import type { CaseDetail } from "../types";
import { RiskBadge, ConfidenceBadge, StatusBadge } from "./Badges";
import ChatPanel from "./ChatPanel";

const SIGNAL_LABELS: { key: keyof CaseDetail; label: string; notableIf: (v: number) => boolean }[] = [
  { key: "duplicate_service_billed", label: "Duplicate service billed", notableIf: (v) => v > 0 },
  { key: "weekly_visit_frequency", label: "Weekly visit frequency", notableIf: (v) => v >= 6 },
  { key: "member_provider_distance_miles", label: "Member-provider distance (mi)", notableIf: (v) => v >= 25 },
  { key: "prior_claims_last_12mo", label: "Prior claims (last 12mo)", notableIf: (v) => v >= 4 },
  { key: "shared_contact_with_provider", label: "Shared contact with provider", notableIf: (v) => v > 0 },
  { key: "weekend_billing_ratio", label: "Weekend billing ratio", notableIf: (v) => v >= 0.15 },
  { key: "amount_vs_peer_avg_pct", label: "Amount vs. peer avg (%)", notableIf: (v) => Math.abs(v) >= 20 },
  { key: "round_dollar_billing_ratio", label: "Round-dollar billing ratio", notableIf: (v) => v >= 0.25 },
  { key: "recent_policy_change_flag", label: "Recent policy change", notableIf: (v) => v > 0 },
  { key: "service_overlap_other_provider", label: "Service overlap w/ other provider", notableIf: (v) => v > 0 },
];

export default function CaseDetailView({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const [data, setData] = useState<CaseDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const load = () => getCase(caseId).then((d) => { setData(d); setNotes(d.investigator_notes ?? ""); });

  useEffect(() => { load(); }, [caseId]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading case...
      </div>
    );
  }

  async function decide(status: "Escalated" | "Dismissed") {
    setSaving(true);
    try {
      const updated = await submitDecision(caseId, status, notes);
      setData(updated);
    } finally {
      setSaving(false);
    }
  }

  function acceptRecommendation() {
    const rec = (data!.recommended_next_step ?? "").toLowerCase();
    decide(rec.includes("escalat") ? "Escalated" : "Dismissed");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to queue
          </button>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {data.case_id} <span className="font-normal text-slate-400">&middot;</span> {data.claim_number}
              </h1>
              <p className="text-sm text-slate-500">
                {data.care_type} &middot; ${data.claim_amount_usd.toLocaleString()} &middot; {data.state} &middot; {data.claim_date}
              </p>
            </div>
            <StatusBadge status={data.review_status} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left: raw signals */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Claim Signals</h2>
            </div>
            <dl className="space-y-1.5">
              {SIGNAL_LABELS.map(({ key, label, notableIf }) => {
                const value = data[key] as number;
                const notable = notableIf(value);
                return (
                  <div
                    key={key as string}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      notable ? "bg-amber-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <dt className={`flex items-center gap-1.5 ${notable ? "font-medium text-amber-900" : "text-slate-600"}`}>
                      {notable && <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />}
                      {label}
                    </dt>
                    <dd className={notable ? "font-semibold text-amber-900" : "font-medium text-slate-800"}>{value}</dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Right: AI assessment */}
          <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI Assessment</h2>
            </div>
            <div className="flex items-center gap-2">
              <RiskBadge level={data.risk_level} />
              <ConfidenceBadge confidence={data.confidence} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{data.risk_overview}</p>

            {data.key_drivers && data.key_drivers.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Key drivers</h3>
                <ul className="mt-2 space-y-2">
                  {data.key_drivers.map((d, i) => (
                    <li key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                      <span className="inline-block rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                        {d.signal} = {d.value}
                      </span>
                      <p className="mt-1.5 text-slate-700">{d.rationale}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.recommended_next_step && (
              <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
                <span className="font-semibold">Recommended next step: </span>
                {data.recommended_next_step}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                disabled={saving}
                onClick={acceptRecommendation}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" /> Accept AI Recommendation
              </button>
              <button
                disabled={saving}
                onClick={() => decide("Escalated")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" /> Escalate to SIU
              </button>
              <button
                disabled={saving}
                onClick={() => decide("Dismissed")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Dismiss (False Positive)
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 p-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Investigator notes</label>
              <textarea
                className="mt-1.5 w-full resize-none rounded-md border border-slate-200 p-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  disabled={savingNotes}
                  onClick={() => {
                    setSavingNotes(true);
                    saveNotes(caseId, notes).then(setData).finally(() => setSavingNotes(false));
                  }}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  {savingNotes ? "Saving..." : "Save notes"}
                </button>
                {data.reviewed_at && (
                  <p className="text-xs text-slate-400">Last reviewed {new Date(data.reviewed_at).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ChatPanel caseId={caseId} />
        </div>
      </div>
    </div>
  );
}
