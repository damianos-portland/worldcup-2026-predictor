import { Brain } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { scoreQuiz } from "@/lib/scoring";
import { PlayerQuizTabs } from "@/components/player-quiz-tabs";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function QuizPage({ params }: { params: { id: string } }) {
  const { league, membership } = await getMembershipOrRedirect(params.id);

  const quizzes = await prisma.quiz.findMany({
    where: { OR: [{ isOpen: true }, { isGraded: true }] },
    orderBy: [{ matchdayKey: "asc" }, { title: "asc" }],
    include: { questions: { orderBy: { order: "asc" } } },
  });

  const myAnswers = await prisma.quizAnswer.findMany({ where: { membershipId: membership.id } });
  const myChoice = new Map(myAnswers.map((a) => [a.questionId, a.choiceIndex]));

  // Quiz Champ (top correct in THIS league) for a graded quiz.
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
    if (max <= 0) return { champs: [] as string[], max: 0 };
    return { champs: [...correct.values()].filter((c) => c.n === max).map((c) => c.name), max };
  }

  const tabData = await Promise.all(
    quizzes.map(async (quiz) => {
      const myAns: Record<string, number> = {};
      for (const q of quiz.questions) if (myChoice.has(q.id)) myAns[q.id] = myChoice.get(q.id)!;

      let result;
      if (quiz.isGraded) {
        let correct = 0;
        for (const q of quiz.questions) if (q.correctIndex >= 0 && myChoice.get(q.id) === q.correctIndex) correct++;
        const champ = await quizChamp(quiz.id, quiz.questions);
        result = {
          correct,
          total: quiz.questions.length,
          points: scoreQuiz(correct, quiz.questions.length),
          champNames: champ.champs,
          champMax: champ.max,
        };
      }

      return {
        id: quiz.id,
        title: quiz.title,
        isGraded: quiz.isGraded,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          text: q.text,
          options: q.options,
          // only reveal the answer once graded
          correctIndex: quiz.isGraded ? q.correctIndex : -1,
        })),
        myAnswers: myAns,
        result,
      };
    })
  );

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 font-display text-xl font-bold">
        <Brain className="h-5 w-5 text-gold" /> Matchday Quizzes
      </h1>

      {tabData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Brain className="h-8 w-8 text-muted-foreground" />
            <h3 className="font-display text-lg font-semibold">No quiz open right now</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              A new quiz drops each matchday. Answer correctly to earn up to 5 bonus points — and you can
              tackle more than one when several are open.
            </p>
          </CardContent>
        </Card>
      ) : (
        <PlayerQuizTabs leagueId={params.id} quizzes={tabData} />
      )}
    </div>
  );
}
