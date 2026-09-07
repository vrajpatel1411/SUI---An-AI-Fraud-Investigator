import { Loader2 } from "lucide-react";

const RISK_STYLES: Record<string, string> = {
  High: "bg-red-50 text-red-700 ring-red-600/20",
  Medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

const RISK_DOT: Record<string, string> = {
  High: "bg-red-500",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
};

const STATUS_STYLES: Record<string, string> = {
  "Pending Review": "bg-slate-100 text-slate-600 ring-slate-500/20",
  Escalated: "bg-red-50 text-red-700 ring-red-600/20",
  Dismissed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

const STATUS_DOT: Record<string, string> = {
  "Pending Review": "bg-slate-400",
  Escalated: "bg-red-500",
  Dismissed: "bg-emerald-500",
};

function Badge({ label, className, dotClassName }: { label: string; className: string; dotClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}>
      {dotClassName && <span className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} />}
      {label}
    </span>
  );
}

export function RiskBadge({ level }: { level: string | null }) {
  if (!level) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-500/20">
        <Loader2 className="h-3 w-3 animate-spin" />
        Triaging
      </span>
    );
  }
  return <Badge label={`${level} Risk`} className={RISK_STYLES[level] ?? ""} dotClassName={RISK_DOT[level]} />;
}

export function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return null;
  return <Badge label={`${confidence} confidence`} className="bg-indigo-50 text-indigo-700 ring-indigo-600/20" />;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge label={status} className={STATUS_STYLES[status] ?? ""} dotClassName={STATUS_DOT[status]} />;
}
