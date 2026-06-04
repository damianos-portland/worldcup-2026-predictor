import { prisma } from "@/lib/prisma";
import type { League, Match, Prediction } from "@prisma/client";
import { matchdayKey, matchdayLabel } from "@/lib/matchday";

export type ScoreBreakdown = {
  points: number;
  isExact: boolean;
  isOutcome: boolean;
};

function outcome(home: number, away: number): "H" | "D" | "A" {
  if (home > away) return "H";
  if (home < away) return "A";
  return "D";
}

/**
 * Score a single prediction against a finished match.
 * Golden matches double the base points (exact 20 / outcome 6).
 * An activated Joker doubles the resulting match points on top of that.
 */
export function scorePrediction(
  prediction: Pick<Prediction, "homeScore" | "awayScore" | "jokerUsed" | "powerPick">,
  match: Pick<Match, "homeScore" | "awayScore" | "isGolden">,
  league: Pick<League, "exactPoints" | "outcomePoints">
): ScoreBreakdown {
  if (match.homeScore == null || match.awayScore == null) {
    return { points: 0, isExact: false, isOutcome: false };
  }

  const goldenMultiplier = match.isGolden ? 2 : 1;
  const jokerMultiplier = prediction.jokerUsed ? 2 : 1;

  const isExact =
    prediction.homeScore === match.homeScore &&
    prediction.awayScore === match.awayScore;

  const isOutcome =
    outcome(prediction.homeScore, prediction.awayScore) ===
    outcome(match.homeScore, match.awayScore);

  let base = 0;
  if (isExact) base = league.exactPoints;
  else if (isOutcome) base = league.outcomePoints;

  // Power Pick adds +50% (rounded up). Multipliers stack:
  // e.g. Golden + Joker + Power Pick on an exact = 10×2×2×1.5 = 60.
  const stacked = base * goldenMultiplier * jokerMultiplier;
  const points = prediction.powerPick ? Math.round(stacked * 1.5) : stacked;

  return {
    points,
    isExact,
    isOutcome: isOutcome && !isExact,
  };
}

/**
 * Streak bonus: +5 the moment a run of exact scores reaches 3,
 * +15 the moment it reaches 5 (chronological order by kickoff).
 */
export function computeStreakBonus(
  exactFlagsInOrder: boolean[]
): { bonus: number; hit3: boolean; hit5: boolean } {
  let run = 0;
  let bonus = 0;
  let hit3 = false;
  let hit5 = false;
  for (const isExact of exactFlagsInOrder) {
    if (isExact) {
      run += 1;
      if (run === 3) {
        bonus += 5;
        hit3 = true;
      }
      if (run === 5) {
        bonus += 15;
        hit5 = true;
      }
    } else {
      run = 0;
    }
  }
  return { bonus, hit3, hit5 };
}

/**
 * Matchday-quiz scoring, proportional to the number of questions so a 6- or
 * 10-question quiz both work: a perfect score = 5, ≥60% scales 1–4, <60% = 0.
 * (For a 10-question quiz this gives the classic 6→1, 7→2, 8→3, 9→4, 10→5.)
 */
export function scoreQuiz(correct: number, total: number): number {
  if (total <= 0) return 0;
  const ratio = correct / total;
  if (ratio >= 1) return 5;
  if (ratio < 0.6) return 0;
  return Math.min(4, Math.max(1, Math.round((ratio - 0.5) * 10)));
}

/** Total quiz points for a membership across all GRADED quizzes (+ perfect-round flag). */
export async function membershipQuizPoints(
  membershipId: string
): Promise<{ points: number; perfectRound: boolean }> {
  const quizzes = await prisma.quiz.findMany({
    where: { isGraded: true },
    include: { questions: { select: { id: true, correctIndex: true } } },
  });
  if (quizzes.length === 0) return { points: 0, perfectRound: false };

  const answers = await prisma.quizAnswer.findMany({
    where: { membershipId },
    select: { questionId: true, choiceIndex: true },
  });
  const choiceByQ = new Map(answers.map((a) => [a.questionId, a.choiceIndex]));

  let points = 0;
  let perfectRound = false;
  for (const quiz of quizzes) {
    const total = quiz.questions.length;
    let correct = 0;
    for (const q of quiz.questions) {
      if (q.correctIndex >= 0 && choiceByQ.get(q.id) === q.correctIndex) correct++;
    }
    points += scoreQuiz(correct, total);
    if (total > 0 && correct === total) perfectRound = true;
  }
  return { points, perfectRound };
}

/**
 * Recalculate everything for a league: per-prediction points, bonuses,
 * streaks, totals, ranks (with movement) and achievements.
 * Safe to run repeatedly — it is fully idempotent.
 */
export async function recalculateLeague(leagueId: string) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return;

  const memberships = await prisma.membership.findMany({
    where: { leagueId },
    include: {
      predictions: { include: { match: true } },
      winnerPick: { include: { nationalTeam: true } },
      topScorerPick: { include: { player: true } },
    },
  });

  const topScorer = await prisma.player.findFirst({ where: { isTopScorer: true } });
  const final = await prisma.match.findFirst({
    where: { round: "FINAL", status: "FINISHED" },
  });
  let champion: string | null = null;
  if (final && final.homeScore != null && final.awayScore != null) {
    champion =
      final.homeScore >= final.awayScore ? final.homeTeamId : final.awayTeamId;
  }

  for (const m of memberships) {
    const unlocked = new Set<string>();
    let predictionPoints = 0;
    let exactCount = 0;
    let outcomeCount = 0;
    let knockoutExact = 0;
    let jokerPoints = 0;

    // Score finished predictions, ordered chronologically for streaks
    const finished = m.predictions
      .filter((p) => p.match.status === "FINISHED")
      .sort((a, b) => a.match.kickoff.getTime() - b.match.kickoff.getTime());

    const exactFlags: boolean[] = [];

    for (const p of m.predictions) {
      const isFinished = p.match.status === "FINISHED";
      if (!isFinished) {
        await prisma.prediction.update({
          where: { id: p.id },
          data: { points: 0, isExact: false, isOutcome: false, scored: false },
        });
        continue;
      }
      const breakdown = scorePrediction(p, p.match, league);
      await prisma.prediction.update({
        where: { id: p.id },
        data: {
          points: breakdown.points,
          isExact: breakdown.isExact,
          isOutcome: breakdown.isOutcome,
          scored: true,
        },
      });
      predictionPoints += breakdown.points;
      if (breakdown.isExact) {
        exactCount += 1;
        if (p.match.phase === "KNOCKOUT") knockoutExact += 1;
        if (p.match.isGolden) unlocked.add("GOLDEN_MATCH_SPECIALIST");
      }
      if (breakdown.isOutcome) outcomeCount += 1;
      if (p.jokerUsed) {
        jokerPoints += breakdown.points;
        if (breakdown.points >= 20) unlocked.add("JOKER_MASTER");
      }
    }

    for (const p of finished) {
      const breakdown = scorePrediction(p, p.match, league);
      exactFlags.push(breakdown.isExact);
    }

    const streak = computeStreakBonus(exactFlags);

    // Bonus picks — a one-time replacement (used after the original was
    // eliminated) only awards HALF the bonus.
    let winnerBonus = 0;
    if (m.winnerPick && champion && m.winnerPick.nationalTeamId === champion) {
      winnerBonus = m.winnerPick.isReplacement
        ? Math.round(league.winnerBonus / 2)
        : league.winnerBonus;
      unlocked.add("CHAMPION_HUNTER");
    }
    let topScorerBonus = 0;
    if (m.topScorerPick && topScorer && m.topScorerPick.playerId === topScorer.id) {
      topScorerBonus = m.topScorerPick.isReplacement
        ? Math.round(league.topScorerBonus / 2)
        : league.topScorerBonus;
      unlocked.add("TOP_SCORER_EXPERT");
    }

    // Matchday quiz points
    const quiz = await membershipQuizPoints(m.id);
    if (quiz.perfectRound) unlocked.add("PERFECT_ROUND");

    const total =
      predictionPoints + streak.bonus + winnerBonus + topScorerBonus + quiz.points;

    await prisma.membership.update({
      where: { id: m.id },
      data: { totalPoints: total },
    });

    await prisma.tournamentWinnerPick.updateMany({
      where: { membershipId: m.id },
      data: { awarded: winnerBonus > 0 },
    });
    await prisma.topScorerPick.updateMany({
      where: { membershipId: m.id },
      data: { awarded: topScorerBonus > 0 },
    });

    // Achievements
    if (exactCount >= 1) unlocked.add("PERFECT_PREDICTOR");
    if (exactCount >= 10) unlocked.add("EXACT_10");
    if (exactCount >= 25) unlocked.add("EXACT_25");
    if (knockoutExact >= 5) unlocked.add("KING_OF_KNOCKOUTS");
    if (streak.hit3) unlocked.add("STREAK_3");
    if (streak.hit5) unlocked.add("STREAK_5");

    for (const key of unlocked) {
      await prisma.achievement.upsert({
        where: { membershipId_type: { membershipId: m.id, type: key } },
        create: { membershipId: m.id, type: key },
        update: {},
      });
    }
  }

  // Re-rank: store previous rank for movement indicators
  const ranked = await prisma.membership.findMany({
    where: { leagueId },
    orderBy: [{ totalPoints: "desc" }, { joinedAt: "asc" }],
  });
  let rank = 1;
  for (const m of ranked) {
    await prisma.membership.update({
      where: { id: m.id },
      data: { previousRank: m.currentRank || rank, currentRank: rank },
    });
    rank += 1;
  }

  await computeMatchdayAwards(leagueId);
}

/**
 * Manager of the Matchday: for each fully-finished matchday/round, award the
 * member(s) who scored the most prediction points that matchday. Idempotent —
 * recomputed each recalc; notifies only on a newly-won award.
 */
async function computeMatchdayAwards(leagueId: string) {
  const matches = await prisma.match.findMany({
    select: { id: true, kickoff: true, status: true },
  });
  // Group match IDs by matchday (calendar day), tracking whether all are finished.
  const byKey = new Map<string, { ids: Set<string>; allFinished: boolean }>();
  for (const mt of matches) {
    const key = matchdayKey(mt);
    if (!byKey.has(key)) byKey.set(key, { ids: new Set(), allFinished: true });
    const entry = byKey.get(key)!;
    entry.ids.add(mt.id);
    if (mt.status !== "FINISHED") entry.allFinished = false;
  }

  const existing = await prisma.matchdayAward.findMany({ where: { leagueId } });
  const existingSet = new Set(existing.map((a) => `${a.matchdayKey}|${a.membershipId}`));

  const preds = await prisma.prediction.findMany({
    where: { membership: { leagueId }, scored: true },
    select: { membershipId: true, matchId: true, points: true },
  });

  // Recompute from scratch (clears any stale keys) then recreate winners.
  await prisma.matchdayAward.deleteMany({ where: { leagueId } });

  for (const [key, info] of byKey) {
    if (!info.allFinished) continue; // award only when the whole day is finished

    const sums = new Map<string, number>();
    for (const p of preds) {
      if (!info.ids.has(p.matchId)) continue;
      sums.set(p.membershipId, (sums.get(p.membershipId) ?? 0) + p.points);
    }
    const max = Math.max(0, ...sums.values());
    if (max <= 0) continue; // nobody scored — no award

    const winners = [...sums.entries()].filter(([, v]) => v === max).map(([id]) => id);
    const label = matchdayLabel(key);
    for (const membershipId of winners) {
      await prisma.matchdayAward.create({
        data: { leagueId, membershipId, matchdayKey: key, label, points: max },
      });
      if (!existingSet.has(`${key}|${membershipId}`)) {
        const ms = await prisma.membership.findUnique({ where: { id: membershipId } });
        if (ms) {
          await prisma.notification.create({
            data: {
              userId: ms.userId,
              type: "BONUS_EARNED",
              title: "👑 Manager of the Matchday!",
              message: `You topped ${label} with ${max} points.`,
            },
          });
        }
      }
    }
  }
}

/** Detailed point breakdown for a single membership (profile/statistics page). */
export async function membershipStats(membershipId: string) {
  const m = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      predictions: { include: { match: true } },
      winnerPick: true,
      topScorerPick: true,
      league: true,
    },
  });
  if (!m) return null;

  const finished = m.predictions.filter((p) => p.match.status === "FINISHED");
  const exact = finished.filter((p) => p.isExact);
  const outcomeOnly = finished.filter((p) => p.isOutcome);
  const pointsFromExact = exact.reduce((s, p) => s + p.points, 0);
  const pointsFromOutcomes = outcomeOnly.reduce((s, p) => s + p.points, 0);
  const pointsFromJoker = finished
    .filter((p) => p.jokerUsed)
    .reduce((s, p) => s + Math.floor(p.points / 2), 0);

  const ordered = [...finished].sort(
    (a, b) => a.match.kickoff.getTime() - b.match.kickoff.getTime()
  );
  const streak = computeStreakBonus(ordered.map((p) => p.isExact));

  const quiz = await membershipQuizPoints(m.id);

  const winnerBonus = m.winnerPick?.awarded
    ? m.winnerPick.isReplacement
      ? Math.round(m.league.winnerBonus / 2)
      : m.league.winnerBonus
    : 0;
  const topScorerBonus = m.topScorerPick?.awarded
    ? m.topScorerPick.isReplacement
      ? Math.round(m.league.topScorerBonus / 2)
      : m.league.topScorerBonus
    : 0;

  return {
    exactCorrect: exact.length,
    outcomeCorrect: outcomeOnly.length,
    predictionsMade: m.predictions.length,
    predictionsScored: finished.length,
    accuracy:
      finished.length === 0
        ? 0
        : Math.round(((exact.length + outcomeOnly.length) / finished.length) * 100),
    pointsFromExact,
    pointsFromOutcomes,
    pointsFromWinner: winnerBonus,
    pointsFromTopScorer: topScorerBonus,
    pointsFromJoker,
    pointsFromStreaks: streak.bonus,
    pointsFromQuiz: quiz.points,
    totalPoints: m.totalPoints,
  };
}
