"use client";

import { useState } from "react";
import { QuizEditor } from "@/components/admin/quiz-editor";
import type { QuizMatch } from "@/lib/quiz-templates";
import { cn } from "@/lib/utils";

type QuizData = {
  id: string; title: string; isOpen: boolean; isGraded: boolean;
  answerCount: number;
  questions: { id: string; text: string; options: string[]; correctIndex: number }[];
};

export function AdminQuizTabs({ quizzes }: { quizzes: { quiz: QuizData; matches: QuizMatch[] }[] }) {
  const [active, setActive] = useState(0);
  if (quizzes.length === 0) return null;
  const idx = Math.min(active, quizzes.length - 1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {quizzes.map((q, i) => (
          <button
            key={q.quiz.id}
            onClick={() => setActive(i)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
              i === idx ? "border-gold/50 bg-gold/15 text-gold" : "border-white/10 text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", q.quiz.isGraded ? "bg-emerald-400" : q.quiz.isOpen ? "bg-gold" : "bg-white/30")} />
            {q.quiz.title}
            <span className="text-xs opacity-70">({q.quiz.questions.length})</span>
          </button>
        ))}
      </div>
      <QuizEditor quiz={quizzes[idx].quiz} matches={quizzes[idx].matches} />
    </div>
  );
}
