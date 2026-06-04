"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Check, Lock, Unlock, GraduationCap, RotateCcw } from "lucide-react";
import {
  addQuizQuestion, deleteQuizQuestion, setCorrectAnswer, setQuizOpen, gradeQuiz, ungradeQuiz,
} from "@/app/actions/quiz";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Question = { id: string; text: string; options: string[]; correctIndex: number };
type Quiz = {
  id: string; title: string; isOpen: boolean; isGraded: boolean;
  questions: Question[]; answerCount: number;
};

export function QuizEditor({ quiz }: { quiz: Quiz }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [options, setOptions] = useState("");

  function run(fn: () => Promise<any>) {
    start(async () => { await fn(); router.refresh(); });
  }

  function addQuestion() {
    if (!text.trim() || options.split("\n").filter((o) => o.trim()).length < 2) return;
    const fd = new FormData();
    fd.set("quizId", quiz.id); fd.set("text", text); fd.set("options", options);
    run(async () => { await addQuizQuestion(fd); setText(""); setOptions(""); });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold">{quiz.title}</h3>
          <Badge variant="secondary">{quiz.questions.length} Q</Badge>
          <Badge variant="secondary">{quiz.answerCount} answers</Badge>
          {quiz.isGraded ? <Badge variant="success">Graded</Badge> : quiz.isOpen ? <Badge variant="gold">Open</Badge> : <Badge variant="secondary">Closed</Badge>}
        </div>
        <div className="flex gap-2">
          {!quiz.isGraded && (
            <button onClick={() => { const fd = new FormData(); fd.set("quizId", quiz.id); fd.set("open", (!quiz.isOpen).toString()); run(() => setQuizOpen(fd)); }}
              disabled={pending}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20">
              {quiz.isOpen ? <><Lock className="h-3 w-3" /> Close</> : <><Unlock className="h-3 w-3" /> Open</>}
            </button>
          )}
          {quiz.isGraded ? (
            <button onClick={() => { const fd = new FormData(); fd.set("quizId", quiz.id); run(() => ungradeQuiz(fd)); }} disabled={pending}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20">
              <RotateCcw className="h-3 w-3" /> Ungrade
            </button>
          ) : (
            <button onClick={() => { const fd = new FormData(); fd.set("quizId", quiz.id); run(() => gradeQuiz(fd)); }} disabled={pending}
              className="flex items-center gap-1 rounded-lg btn-gold px-2.5 py-1 text-xs font-semibold">
              <GraduationCap className="h-3 w-3" /> Grade
            </button>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-2">
        {quiz.questions.map((q, qi) => (
          <div key={q.id} className="rounded-xl border border-white/5 bg-black/20 p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="text-sm font-medium">{qi + 1}. {q.text}</div>
              <button onClick={() => { const fd = new FormData(); fd.set("questionId", q.id); run(() => deleteQuizQuestion(fd)); }} disabled={pending}
                className="text-muted-foreground hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {q.options.map((opt, oi) => (
                <button key={oi}
                  onClick={() => { const fd = new FormData(); fd.set("questionId", q.id); fd.set("correctIndex", oi.toString()); run(() => setCorrectAnswer(fd)); }}
                  disabled={pending}
                  className={cn("flex items-center gap-1 rounded-lg border px-2 py-1 text-xs",
                    q.correctIndex === oi ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-muted-foreground hover:border-gold/40")}>
                  {q.correctIndex === oi && <Check className="h-3 w-3" />}{opt}
                </button>
              ))}
            </div>
            {q.correctIndex < 0 && <div className="mt-1.5 text-[10px] text-gold/70">Click the correct answer (after the matches finish)</div>}
          </div>
        ))}
      </div>

      {/* Add question */}
      {!quiz.isGraded && (
        <div className="mt-3 space-y-2 rounded-xl border border-dashed border-white/10 p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Question, e.g. Who wins Brazil vs Morocco?"
            className="h-9 w-full rounded-lg border border-input bg-black/30 px-3 text-sm focus-visible:outline-none" />
          <textarea value={options} onChange={(e) => setOptions(e.target.value)} placeholder={"One option per line\nBrazil\nDraw\nMorocco"} rows={3}
            className="w-full rounded-lg border border-input bg-black/30 px-3 py-2 text-sm focus-visible:outline-none" />
          <button onClick={addQuestion} disabled={pending}
            className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add question
          </button>
        </div>
      )}
    </div>
  );
}
