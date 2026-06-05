import { Brain } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CreateQuiz } from "@/components/admin/create-quiz";
import { AdminQuizTabs } from "@/components/admin/admin-quiz-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { computeQuizMatchdays } from "@/lib/quiz-matchday";
import type { QuizMatch } from "@/lib/quiz-templates";

export const dynamic = "force-dynamic";

export default async function AdminQuizPage() {
  const [quizzes, matches] = await Promise.all([
    prisma.quiz.findMany({
      orderBy: [{ matchdayKey: "asc" }, { title: "asc" }],
      include: { questions: { orderBy: { order: "asc" } } },
    }),
    prisma.match.findMany({
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
      },
    }),
  ]);

  // Chronological quiz matchdays (4–8 matches, Greek-evening aligned).
  const matchdays = computeQuizMatchdays(
    matches.map((m) => ({ id: m.id, kickoff: m.kickoff, phase: m.phase }))
  );

  // matchId → builder-friendly QuizMatch (only fixtures with both teams).
  const quizMatchById = new Map<string, QuizMatch>();
  for (const m of matches) {
    if (!m.homeTeam || !m.awayTeam) continue;
    quizMatchById.set(m.id, {
      id: m.id,
      label: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
      home: m.homeTeam.name,
      away: m.awayTeam.name,
      homePlayers: m.homeTeam.players.map((p) => p.name),
      awayPlayers: m.awayTeam.players.map((p) => p.name),
    });
  }
  const matchesByKey = new Map<string, QuizMatch[]>();
  for (const md of matchdays) {
    matchesByKey.set(
      md.key,
      md.matchIds.map((id) => quizMatchById.get(id)).filter(Boolean) as QuizMatch[]
    );
  }

  const counts = await Promise.all(
    quizzes.map((q) => prisma.quizAnswer.count({ where: { question: { quizId: q.id } } }))
  );

  const tabData = quizzes.map((q, i) => ({
    quiz: {
      id: q.id, title: q.title, isOpen: q.isOpen, isGraded: q.isGraded, answerCount: counts[i],
      questions: q.questions.map((qq) => ({ id: qq.id, text: qq.text, options: qq.options, correctIndex: qq.correctIndex })),
    },
    matches: matchesByKey.get(q.matchdayKey) ?? [],
  }));

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardContent className="p-5">
          <h3 className="mb-1 flex items-center gap-2 font-display font-bold">
            <Brain className="h-5 w-5 text-gold" /> Matchday Quizzes
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Matchdays are chronological bunches of 4–8 matches (Greek-evening aligned). You can create
            several quizzes per matchday so players who miss the late games still get a fresh one.
            Set the correct answers after the games, then hit <span className="text-gold">Grade</span>.
          </p>
          <CreateQuiz matchdays={matchdays.map((m) => ({ key: m.key, label: m.label, count: m.count }))} />
        </CardContent>
      </Card>

      {tabData.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No quizzes yet — create one above.</CardContent></Card>
      ) : (
        <AdminQuizTabs quizzes={tabData} />
      )}
    </div>
  );
}
