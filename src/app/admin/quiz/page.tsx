import { Brain } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CreateQuiz } from "@/components/admin/create-quiz";
import { QuizEditor } from "@/components/admin/quiz-editor";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminQuizPage() {
  const quizzes = await prisma.quiz.findMany({
    orderBy: { matchdayKey: "asc" },
    include: {
      questions: { orderBy: { order: "asc" } },
    },
  });

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
