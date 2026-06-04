"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { submitQuizAnswer } from "@/app/actions/quiz";
import { cn } from "@/lib/utils";

type Question = { id: string; text: string; options: string[] };

export function QuizForm({
  leagueId,
  questions,
  initialAnswers,
}: {
  leagueId: string;
  questions: Question[];
  initialAnswers: Record<string, number>;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, start] = useTransition();

  function choose(questionId: string, choiceIndex: number) {
    setAnswers((a) => ({ ...a, [questionId]: choiceIndex }));
    setSavingId(questionId);
    const fd = new FormData();
    fd.set("leagueId", leagueId);
    fd.set("questionId", questionId);
    fd.set("choiceIndex", choiceIndex.toString());
    start(async () => {
      await submitQuizAnswer(fd);
      setSavingId(null);
    });
  }

  const answered = Object.keys(answers).length;

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">{answered}/{questions.length} answered</div>
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <span className="text-gold">{qi + 1}.</span> {q.text}
            {savingId === q.id && <Loader2 className="h-3 w-3 animate-spin text-gold" />}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {q.options.map((opt, oi) => {
              const selected = answers[q.id] === oi;
              return (
                <button key={oi} onClick={() => choose(q.id, oi)}
                  className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    selected ? "border-gold/50 bg-gold/15 text-gold" : "border-white/10 hover:border-gold/30")}>
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", selected ? "border-gold bg-gold text-pitch-900" : "border-white/30")}>
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
