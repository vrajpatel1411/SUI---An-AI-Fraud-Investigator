import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Search, ShieldCheck, ShieldAlert, ShieldQuestion, Sparkles } from "lucide-react";
import { listCases } from "../api";
import type { CaseListItem } from "../types";
import { RiskBadge, ConfidenceBadge, StatusBadge } from "./Badges";

const RISK_FILTERS = [
  { label: "All", value: "" },
  { label: "High", value: "High" },
  { label: "Medium", value: "Medium" },
  { label: "Low", value: "Low" },
];

export default function QueueView({ onSelect }: { onSelect: (caseId: string) => void }) {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [riskFilter, setRiskFilter] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listCases({ risk_level: riskFilter || undefined })
      .then(setCases)
      .finally(() => setLoading(false));
  }, [riskFilter]);

  const summary = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0, untriaged: 0 };
    for (const c of cases) {
      if (c.risk_level) counts[c.risk_level]++;
      else counts.untriaged++;
    }
    return counts;
  }, [cases]);

  const visibleCases = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.case_id.toLowerCase().includes(q) ||
        c.claim_number.toLowerCase().includes(q) ||
        c.care_type.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q)
    );
  }, [cases, query]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">SIU Fraud Triage</h1>
            <p className="text-xs text-slate-500">AI-assisted claim review queue</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Total cases"
            value={cases.length}
            accent="bg-slate-100 text-slate-600"
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="High risk"
            value={summary.High}
            accent="bg-red-50 text-red-600"
          />
          <StatCard
            icon={<ShieldQuestion className="h-4 w-4" />}
            label="Medium risk"
            value={summary.Medium}
            accent="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Low risk"
            value={summary.Low}
            accent="bg-emerald-50 text-emerald-600"
          />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-lg bg-slate-100 p-1">
            {RISK_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setRiskFilter(f.value)}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  riskFilter === f.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search case, claim #, state..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Case</th>
                <th className="px-5 py-3">Care Type</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">State</th>
                <th className="px-5 py-3">Risk</th>
                <th className="px-5 py-3">Confidence</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-5 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))}

              {!loading && visibleCases.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">
                    No cases match your filters.
                  </td>
                </tr>
              )}

              {!loading &&
                visibleCases.map((c) => (
                  <tr
                    key={c.case_id}
                    className="group cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => onSelect(c.case_id)}
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900">{c.case_id}</td>
                    <td className="px-5 py-3.5 text-slate-600">{c.care_type}</td>
                    <td className="px-5 py-3.5 text-slate-600">${c.claim_amount_usd.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-slate-600">{c.state}</td>
                    <td className="px-5 py-3.5"><RiskBadge level={c.risk_level} /></td>
                    <td className="px-5 py-3.5"><ConfidenceBadge confidence={c.confidence} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.review_status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>{icon}</div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
