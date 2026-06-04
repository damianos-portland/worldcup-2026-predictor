import { prisma } from "@/lib/prisma";
import type { League, Match, Prediction } from "@prisma/client";

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
  prediction: Pick<Prediction, "homeScore" | "awayScore" | "jokerUsed">,
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

  return {
    points: base * goldenMultiplier * jokerMultiplier,
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

    const total =
      predictionPoints + streak.bonus + winnerBonus + topScorerBonus;

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
    totalPoints: m.totalPoints,
  };
}
