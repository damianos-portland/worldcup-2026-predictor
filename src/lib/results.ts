import { prisma } from "@/lib/prisma";
import { recalculateLeague } from "@/lib/scoring";

/** Recalculate every league (call after any result changes). */
export async function recalcAllLeagues() {
  const leagues = await prisma.league.findMany({ select: { id: true } });
  for (const l of leagues) await recalculateLeague(l.id);
}

// Which round each knockout round feeds into (null = end of the line).
const NEXT_ROUND: Record<string, string | null> = {
  ROUND_OF_32: "ROUND_OF_16",
  ROUND_OF_16: "QUARTER_FINAL",
  QUARTER_FINAL: "SEMI_FINAL",
  SEMI_FINAL: "FINAL",
  THIRD_PLACE: null,
  FINAL: null,
};

/**
 * After a knockout result, place the winner into the correct next-round fixture.
 * Match IDs are deterministic: `ko-<ROUND>-<index>`. Match i feeds next-round
 * match ceil(i/2), home slot if i is odd else away. Semi-final losers drop into
 * the third-place match. Draws are skipped (a shootout winner is set manually).
 */
export async function advanceKnockoutWinner(matchId: string) {
  const m = await prisma.match.findUnique({ where: { id: matchId } });
  if (!m || m.phase !== "KNOCKOUT") return;
  if (m.homeScore == null || m.awayScore == null) return;
  if (m.homeScore === m.awayScore) return; // shootout → manual
  if (!m.homeTeamId || !m.awayTeamId) return;

  const homeWon = m.homeScore > m.awayScore;
  const winnerId = homeWon ? m.homeTeamId : m.awayTeamId;
  const loserId = homeWon ? m.awayTeamId : m.homeTeamId;

  const parts = m.id.split("-"); // ["ko", "ROUND_OF_32", "3"]
  const index = parseInt(parts[2] ?? "", 10);
  if (Number.isNaN(index)) return;

  const nextRound = NEXT_ROUND[m.round];
  if (nextRound) {
    const nextIndex = Math.ceil(index / 2);
    const nextId = `ko-${nextRound}-${nextIndex}`;
    const data = index % 2 === 1 ? { homeTeamId: winnerId } : { awayTeamId: winnerId };
    await prisma.match.updateMany({ where: { id: nextId }, data });
  }

  if (m.round === "SEMI_FINAL") {
    const data = index === 1 ? { homeTeamId: loserId } : { awayTeamId: loserId };
    await prisma.match.updateMany({ where: { id: "ko-THIRD_PLACE-1" }, data });
  }
}

/**
 * Finalize a match: store the official score, mark it FINISHED, advance the
 * bracket, and recalculate every league. Shared by the admin action and the
 * live worker.
 */
export async function finalizeMatch(matchId: string, homeScore: number, awayScore: number) {
  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, status: "FINISHED" },
  });
  await advanceKnockoutWinner(matchId);
  await recalcAllLeagues();
}
