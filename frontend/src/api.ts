import type { CaseDetail, CaseListItem, ChatMessage } from "./types";

const BASE = "http://localhost:8000/api";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export function listCases(filters: { risk_level?: string; care_type?: string; review_status?: string }): Promise<CaseListItem[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
  return fetch(`${BASE}/cases?${params}`).then((res) => json<CaseListItem[]>(res));
}

export function getCase(caseId: string): Promise<CaseDetail> {
  return fetch(`${BASE}/cases/${caseId}`).then((res) => json<CaseDetail>(res));
}

export function submitDecision(caseId: string, status: "Escalated" | "Dismissed", notes: string | null): Promise<CaseDetail> {
  return fetch(`${BASE}/cases/${caseId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, notes }),
  }).then((res) => json<CaseDetail>(res));
}

export function saveNotes(caseId: string, notes: string): Promise<CaseDetail> {
  return fetch(`${BASE}/cases/${caseId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  }).then((res) => json<CaseDetail>(res));
}

export function getChat(caseId: string): Promise<ChatMessage[]> {
  return fetch(`${BASE}/cases/${caseId}/chat`).then((res) => json<ChatMessage[]>(res));
}

export function postChat(caseId: string, message: string): Promise<ChatMessage> {
  return fetch(`${BASE}/cases/${caseId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  }).then((res) => json<ChatMessage>(res));
}
