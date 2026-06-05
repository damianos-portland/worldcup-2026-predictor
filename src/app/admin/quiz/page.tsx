import { Brain } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CreateQuiz } from "@/components/admin/create-quiz";
import { QuizEditor } from "@/components/admin/quiz-editor";
import { Card, CardContent } from "@/components/ui/card";
import { quizMatchdayKey, quizMatchdayLabel, QUIZ_MATCHDAY_ORDER, type QuizMatch } from "@/lib/quiz-templates";

export const dynamic = "force-dynamic";

export default async function AdminQuizPage() {
  const [quizzes, matches] = await Promise.all([
    prisma.quiz.findMany({
      orderBy: { matchdayKey: "asc" },
      include: { questions: { orderBy: { order: "asc" } } },
    }),
    prisma.match.findMany({
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
      },
    }),
  ]);

  // Quiz matchdays = 12 groups (6 matches each) + knockout rounds.
  const dayMeta = new Map<string, number>();
  for (const m of matches) dayMeta.set(quizMatchdayKey(m), (dayMeta.get(quizMatchdayKey(m)) ?? 0) + 1);
  const allMatchdays = [...dayMeta.entries()]
    .sort(([a], [b]) => QUIZ_MATCHDAY_ORDER.indexOf(a) - QUIZ_MATCHDAY_ORDER.indexOf(b))
    .map(([key, count]) => ({ key, label: quizMatchdayLabel(key), count }));

  // Group matches (that have both teams) by quiz matchday for the question builder.
  const matchesByKey = new Map<string, QuizMatch[]>();
  for (const m of matches) {
    if (!m.homeTeam || !m.awayTeam) continue;
    const key = quizMatchdayKey(m);
    if (!matchesByKey.has(key)) matchesByKey.set(key, []);
    matchesByKey.get(key)!.push({
      id: m.id,
      label: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
      home: m.homeTeam.name,
      away: m.awayTeam.name,
      homePlayers: m.homeTeam.players.map((p) => p.name),
      awayPlayers: m.awayTeam.players.map((p) => p.name),
    });
  }

  // answer counts per quiz
  const counts = await Promise.all(
    quizzes.map((q) =>
      prisma.quizAnswer.count({ where: { question: { quizId: q.id } } })
    )
  );

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardContent className="p-5">
          <h3 className="mb-1 flex items-center gap-2 font-display font-bold">
            <Brain className="h-5 w-5 text-gold" /> Matchday Quizzes
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            One quiz per group (6 matches) or knockout round — 2 questions per match makes a tidy 10–12. Open it for answers,
            then set the correct answers after the games and hit <span className="text-gold">Grade</span>.
            Scoring scales with the number of questions: a perfect round = 5 pts, 60%+ scales 1–4, plus a Quiz Genius badge for 100%.
          </p>
          <CreateQuiz matchdays={allMatchdays} existing={quizzes.map((q) => q.matchdayKey)} />
        </CardContent>
      </Card>

      {quizzes.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No quizzes yet — create one above.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {quizzes.map((q, i) => (
            <QuizEditor
              key={q.id}
              matches={matchesByKey.get(q.matchdayKey) ?? []}
              quiz={{
                id: q.id,
                title: q.title,
                isOpen: q.isOpen,
                isGraded: q.isGraded,
                answerCount: counts[i],
                questions: q.questions.map((qq) => ({
                  id: qq.id, text: qq.text, options: qq.options, correctIndex: qq.correctIndex,
                })),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
