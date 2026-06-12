import { prisma } from "@/lib/prisma";

// Works out who in a league still owes predictions and/or quiz answers, so the
// admin can nudge exactly those people.
export type PendingMember = {
  userId: string;
  email: string;
  name: string;
  teamName: string;
  missingPredictions: number; // upcoming matches (within the window) not yet predicted
  missingQuizzes: number; // open quizzes not fully answered
};

/**
 * @param withinHours only count upcoming matches kicking off within this many hours
 *                     (so we don't nag about games that are days away).
 */
export async function getLeaguePending(leagueId: string, withinHours = 24): Promise<PendingMember[]> {
  const now = new Date();
  const horizon = new Date(now.getTime() + withinHours * 3_600_000);

  const [upcoming, openQuizzes, memberships] = await Promise.all([
    prisma.match.findMany({
      where: {
        status: "UPCOMING",
        kickoff: { gt: now, lte: horizon },
        homeTeamId: { not: null },
        awayTeamId: { not: null },
      },
      select: { id: true },
    }),
    prisma.quiz.findMany({
      where: { isOpen: true },
      select: { id: true, questions: { select: { id: true } } },
    }),
    prisma.membership.findMany({
      where: { leagueId },
      select: { id: true, teamName: true, user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const upcomingIds = upcoming.map((m) => m.id);
  const membershipIds = memberships.map((m) => m.id);
  const quizIds = openQuizzes.map((q) => q.id);

  const [preds, answers] = await Promise.all([
    upcomingIds.length && membershipIds.length
      ? prisma.prediction.findMany({
          where: { membershipId: { in: membershipIds }, matchId: { in: upcomingIds } },
          select: { membershipId: true },
        })
      : Promise.resolve([] as { membershipId: string }[]),
    quizIds.length && membershipIds.length
      ? prisma.quizAnswer.findMany({
          where: { membershipId: { in: membershipIds }, question: { quizId: { in: quizIds } } },
          select: { membershipId: true, questionId: true },
        })
      : Promise.resolve([] as { membershipId: string; questionId: string }[]),
  ]);

  const predictedCount = new Map<string, number>();
  for (const p of preds) predictedCount.set(p.membershipId, (predictedCount.get(p.membershipId) ?? 0) + 1);

  const answeredByMember = new Map<string, Set<string>>();
  for (const a of answers) {
    let s = answeredByMember.get(a.membershipId);
    if (!s) answeredByMember.set(a.membershipId, (s = new Set()));
    s.add(a.questionId);
  }

  const out: PendingMember[] = [];
  for (const m of memberships) {
    const missingPredictions = upcomingIds.length - (predictedCount.get(m.id) ?? 0);
    const answered = answeredByMember.get(m.id) ?? new Set<string>();
    let missingQuizzes = 0;
    for (const q of openQuizzes) {
      if (q.questions.length === 0) continue;
      if (!q.questions.every((qq) => answered.has(qq.id))) missingQuizzes++;
    }
    if (missingPredictions > 0 || missingQuizzes > 0) {
      out.push({
        userId: m.user.id,
        email: m.user.email,
        name: m.user.name,
        teamName: m.teamName,
        missingPredictions: Math.max(0, missingPredictions),
        missingQuizzes,
      });
    }
  }
  return out;
}
