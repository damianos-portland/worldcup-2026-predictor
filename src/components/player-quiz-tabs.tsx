"use client";

import { useState } from "react";
import { Check, X, Trophy } from "lucide-react";
import { QuizForm } from "@/components/quiz-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Question = { id: string; text: string; options: string[]; correctIndex: number };
type Quiz = {
  id: string;
  title: string;
  isGraded: boolean;
  questions: Question[];
  myAnswers: Record<string, number>;
  result?: { correct: number; total: number; points: number; champNames: string[]; champMax: number };
};

export function PlayerQuizTabs({ leagueId, quizzes }: { leagueId: string; quizzes: Quiz[] }) {
  const [active, setActive] = useState(0);
  const idx = Math.min(active, quizzes.length - 1);
  const q = quizzes[idx];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {quizzes.map((qz, i) => (
          <button
            key={qz.id}
            onClick={() => setActive(i)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
              i === idx ? "border-gold/50 bg-gold/15 text-gold" : "border-white/10 text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", qz.isGraded ? "bg-emerald-400" : "bg-gold")} />
            {qz.title}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-bold">{q.title}</h3>
            {q.isGraded && q.result ? (
              <div className="flex items-center gap-2">
                {q.result.champNames.length > 0 && (
                  <Badge variant="gold"><Trophy className="h-3 w-3" /> Champ: {q.result.champNames.join(", ")} ({q.result.champMax}/{q.result.total})</Badge>
                )}
                <Badge variant={q.result.points > 0 ? "success" : "secondary"}>You: {q.result.correct}/{q.result.total} · +{q.result.points} pts</Badge>
              </div>
            ) : (
              <Badge variant="gold">Open</Badge>
            )}
          </div>

          {q.isGraded ? (
            <div className="space-y-2">
              {q.questions.map((question, qi) => {
                const mine = q.myAnswers[question.id];
                return (
                  <div key={question.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="mb-2 text-sm font-medium"><span className="text-gold">{qi + 1}.</span> {question.text}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {question.options.map((opt, oi) => {
                        const isCorrect = question.correctIndex === oi;
                        const isMine = mine === oi;
                        return (
                          <span key={oi} className={cn("flex items-center gap-1 rounded-lg border px-2 py-1 text-xs",
                            isCorrect ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                              : isMine ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-white/10 text-muted-foreground")}>
                            {isCorrect && <Check className="h-3 w-3" />}{isMine && !isCorrect && <X className="h-3 w-3" />}{opt}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <QuizForm
              leagueId={leagueId}
              questions={q.questions.map((question) => ({ id: question.id, text: question.text, options: question.options }))}
              initialAnswers={q.myAnswers}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
