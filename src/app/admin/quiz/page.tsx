import { Brain } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CreateQuiz } from "@/components/admin/create-quiz";
import { QuizEditor } from "@/components/admin/quiz-editor";
import { Card, CardContent } from "@/components/ui/card";
import { matchdayKey } from "@/lib/matchday";
import type { QuizMatch } from "@/lib/quiz-templates";

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

  // Group matches (that have both teams) by matchday key for the question builder.
  const matchesByKey = new Map<string, QuizMatch[]>();
  for (const m of matches) {
    if (!m.homeTeam || !m.awayTeam) continue;
    const key = matchdayKey(m);
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
            Author ~10 questions per matchday. Open it for answers, then set the correct
            answers after the games and hit <span className="text-gold">Grade</span> to score it
            (0–5 correct = 0 pts, 6→1, 7→2, 8→3, 9→4, 10→5 + a Quiz Genius badge).
          </p>
          <CreateQuiz existing={quizzes.map((q) => q.matchdayKey)} />
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
