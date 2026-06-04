"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createQuiz } from "@/app/actions/quiz";

const MATCHDAYS = [
  { key: "GROUP-1", label: "Group Stage · Matchday 1" },
  { key: "GROUP-2", label: "Group Stage · Matchday 2" },
  { key: "GROUP-3", label: "Group Stage · Matchday 3" },
  { key: "KO-ROUND_OF_32", label: "Round of 32" },
  { key: "KO-ROUND_OF_16", label: "Round of 16" },
  { key: "KO-QUARTER_FINAL", label: "Quarter Finals" },
  { key: "KO-SEMI_FINAL", label: "Semi Finals" },
  { key: "KO-THIRD_PLACE", label: "Third Place" },
  { key: "KO-FINAL", label: "Final" },
];

export function CreateQuiz({ existing }: { existing: string[] }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [pending, start] = useTransition();
  const available = MATCHDAYS.filter((m) => !existing.includes(m.key));

  function onCreate() {
    if (!key) return;
    const fd = new FormData();
    fd.set("matchdayKey", key);
    start(async () => { await createQuiz(fd); setKey(""); router.refresh(); });
  }

  return (
    <div className="flex gap-2">
      <select value={key} onChange={(e) => setKey(e.target.value)}
        className="h-11 flex-1 rounded-xl border border-input bg-black/30 px-3 text-sm focus-visible:outline-none">
        <option value="">Select a matchday…</option>
        {available.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
      </select>
      <button onClick={onCreate} disabled={pending || !key}
        className="flex items-center gap-1.5 rounded-xl btn-gold px-4 text-sm font-semibold disabled:opacity-50">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Quiz
      </button>
    </div>
  );
}
