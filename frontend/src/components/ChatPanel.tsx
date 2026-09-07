import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { MessageCircle, Send, Sparkles, User } from "lucide-react";
import { getChat, postChat } from "../api";
import type { ChatMessage } from "../types";

export default function ChatPanel({ caseId }: { caseId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    getChat(caseId).then(setMessages);
  }, [caseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "human", content: text }]);
    setSending(true);
    try {
      const reply = await postChat(caseId, text);
      setMessages((m) => [...m, reply]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <MessageCircle className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ask about this case</h2>
      </div>

      <div className="max-h-96 min-h-[10rem] space-y-4 overflow-y-auto bg-slate-50/50 px-5 py-4">
        {messages.length === 0 && (
          <div className="flex h-24 items-center justify-center text-center text-sm text-slate-400">
            Ask a follow-up question grounded in this case's signals, e.g. &ldquo;why is the weekend billing ratio flagged?&rdquo;
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex animate-fade-in items-start gap-2.5 ${m.role === "human" ? "flex-row-reverse" : ""}`}>
            <div
              className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                m.role === "human" ? "bg-slate-900 text-white" : "bg-indigo-100 text-indigo-600"
              }`}
            >
              {m.role === "human" ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            </div>
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                m.role === "human"
                  ? "rounded-tr-sm bg-slate-900 text-white"
                  : "rounded-tl-sm border border-slate-200 bg-white text-slate-800"
              }`}
            >
              {m.role === "human" ? (
                m.content
              ) : (
                <div className="space-y-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mt-1 [&_strong]:font-semibold [&_p]:leading-relaxed">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
        <input
          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
          placeholder="Ask a question about this case..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-colors hover:bg-slate-700 disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
