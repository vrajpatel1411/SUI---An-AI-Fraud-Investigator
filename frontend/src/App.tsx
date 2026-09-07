import { useState } from "react";
import QueueView from "./components/QueueView";
import CaseDetailView from "./components/CaseDetailView";

export default function App() {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  return selectedCaseId ? (
    <CaseDetailView caseId={selectedCaseId} onBack={() => setSelectedCaseId(null)} />
  ) : (
    <QueueView onSelect={setSelectedCaseId} />
  );
}
