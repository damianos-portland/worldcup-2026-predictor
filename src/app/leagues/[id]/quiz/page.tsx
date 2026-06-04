import { Brain, Check, X, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { scoreQuiz } from "@/lib/scoring";
import { QuizForm } from "@/components/quiz-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuizPage({ params }: { params: { id: string } }) {
  const { league, membership } = await getMembershipOrRedirect(params.id);

  const quizzes = await prisma.quiz.findMany({
    where: { OR: [{ isOpen: true }, { isGraded: true }] },
    orderBy: { matchdayKey: "asc" },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  const myAnswers = await prisma.quizAnswer.findMany({
    where: { membershipId: membership.id },
  });
  const myChoice = new Map(myAnswers.map((a) => [a.questionId, a.choiceIndex]));

  // Quiz Champ per graded quiz (top correct in THIS league)
  async function quizChamp(quizId: string, questions: { id: string; correctIndex: number }[]) {
    const correctByQ = new Map(questions.map((q) => [q.id, q.correctIndex]));
    const rows = await prisma.quizAnswer.findMany({
      where: { question: { quizId }, membership: { leagueId: league.id } },
      include: { membership: true },
    });
    const correct = new Map<string, { name: string; n: number }>();
    for (const r of rows) {
      const ok = correctByQ.get(r.questionId) === r.choiceIndex;
      const cur = correct.get(r.membershipId) ?? { name: r.membership.teamName, n: 0 };
      cur.n += ok ? 1 : 0;
      correct.set(r.membershipId, cur);
    }
    const max = Math.max(0, ...[...correct.values()].map((c) => c.n));
    if (max <= 0) return null;
    const champs = [...correct.values()].filter((c) => c.n === max).map((c) => c.name);
    return { champs, max };
  }

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 font-display text-xl font-bold">
        <Brain className="h-5 w-5 text-gold" /> Matchday Quiz
      </h1>

      {quizzes.length === 0 && (
        <Card><CardContent className="flex flex-col items-center gap-2 py-14 text-center">
          <Brain className="h-8 w-8 text-muted-foreground" />
          <h3 className="font-display text-lg font-semibold">No quiz open right now</h3>
          <p className="max-w-sm text-sm text-muted-foreground">A new 10-question quiz drops each matchday. Answer correctly to earn up to 5 bonus points.</p>
        </CardContent></Card>
      )}

      {await Promise.all(quizzes.map(async (quiz) => {
        if (quiz.isGraded) {
          let correct = 0;
          for (const q of quiz.questions) {
            if (q.correctIndex >= 0 && myChoice.get(q.id) === q.correctIndex) correct++;
          }
          const pts = scoreQuiz(correct, quiz.questions.length);
          const champ = await quizChamp(quiz.id, quiz.questions);
          return (
            <Card key={quiz.id}>
              <CardContent className="p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display font-bold">{quiz.title}</h3>
                  <div className="flex items-center gap-2">
                    {champ && <Badge variant="gold"><Trophy className="h-3 w-3" /> Champ: {champ.champs.join(", ")} ({champ.max}/{quiz.questions.length})</Badge>}
                    <Badge variant={pts > 0 ? "success" : "secondary"}>You: {correct}/{quiz.questions.length} · +{pts} pts</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {quiz.questions.map((q, qi) => {
                    const mine = myChoice.get(q.id);
                    return (
                      <div key={q.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <div className="mb-2 text-sm font-medium"><span className="text-gold">{qi + 1}.</span> {q.text}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {q.options.map((opt, oi) => {
                            const isCorrect = q.correctIndex === oi;
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
              </CardContent>
            </Card>
          );
        }
        // open quiz
        return (
          <Card key={quiz.id}>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display font-bold">{quiz.title}</h3>
                <Badge variant="gold">Open</Badge>
              </div>
              <QuizForm
                leagueId={params.id}
                questions={quiz.questions.map((q) => ({ id: q.id, text: q.text, options: q.options }))}
                initialAnswers={Object.fromEntries(quiz.questions.filter((q) => myChoice.has(q.id)).map((q) => [q.id, myChoice.get(q.id)!]))}
              />
            </CardContent>
          </Card>
        );
      }))}
    </div>
  );
}
