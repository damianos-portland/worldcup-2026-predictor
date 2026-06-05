import { prisma } from "@/lib/prisma";
import { recalculateLeague } from "@/lib/scoring";

/** Recalculate every league (call after any result changes). */
export async function recalcAllLeagues() {
  const leagues = await prisma.league.findMany({ select: { id: true } });
  for (const l of leagues) await recalculateLeague(l.id);
}

type Slot = "home" | "away";
type Link = { winner: [string, Slot]; loser?: [string, Slot] };

// Exact official 2026 World Cup bracket. Match IDs are `ko-<ROUND>-<n>`, where n
// is the chronological within-round number (matching FIFA's match numbering and
// our seed). Each entry says where that match's WINNER goes (and, for the
// semi-finals, where the LOSER goes — the third-place play-off).
const BRACKET: Record<string, Link> = {
  // Round of 32 → Round of 16
  "ko-ROUND_OF_32-1": { winner: ["ko-ROUND_OF_16-1", "home"] },
  "ko-ROUND_OF_32-3": { winner: ["ko-ROUND_OF_16-1", "away"] },
  "ko-ROUND_OF_32-2": { winner: ["ko-ROUND_OF_16-2", "home"] },
  "ko-ROUND_OF_32-5": { winner: ["ko-ROUND_OF_16-2", "away"] },
  "ko-ROUND_OF_32-4": { winner: ["ko-ROUND_OF_16-3", "home"] },
  "ko-ROUND_OF_32-6": { winner: ["ko-ROUND_OF_16-3", "away"] },
  "ko-ROUND_OF_32-7": { winner: ["ko-ROUND_OF_16-4", "home"] },
  "ko-ROUND_OF_32-8": { winner: ["ko-ROUND_OF_16-4", "away"] },
  "ko-ROUND_OF_32-11": { winner: ["ko-ROUND_OF_16-5", "home"] },
  "ko-ROUND_OF_32-12": { winner: ["ko-ROUND_OF_16-5", "away"] },
  "ko-ROUND_OF_32-9": { winner: ["ko-ROUND_OF_16-6", "home"] },
  "ko-ROUND_OF_32-10": { winner: ["ko-ROUND_OF_16-6", "away"] },
  "ko-ROUND_OF_32-14": { winner: ["ko-ROUND_OF_16-7", "home"] },
  "ko-ROUND_OF_32-16": { winner: ["ko-ROUND_OF_16-7", "away"] },
  "ko-ROUND_OF_32-13": { winner: ["ko-ROUND_OF_16-8", "home"] },
  "ko-ROUND_OF_32-15": { winner: ["ko-ROUND_OF_16-8", "away"] },
  // Round of 16 → Quarter-finals
  "ko-ROUND_OF_16-1": { winner: ["ko-QUARTER_FINAL-1", "home"] },
  "ko-ROUND_OF_16-2": { winner: ["ko-QUARTER_FINAL-1", "away"] },
  "ko-ROUND_OF_16-5": { winner: ["ko-QUARTER_FINAL-2", "home"] },
  "ko-ROUND_OF_16-6": { winner: ["ko-QUARTER_FINAL-2", "away"] },
  "ko-ROUND_OF_16-3": { winner: ["ko-QUARTER_FINAL-3", "home"] },
  "ko-ROUND_OF_16-4": { winner: ["ko-QUARTER_FINAL-3", "away"] },
  "ko-ROUND_OF_16-7": { winner: ["ko-QUARTER_FINAL-4", "home"] },
  "ko-ROUND_OF_16-8": { winner: ["ko-QUARTER_FINAL-4", "away"] },
  // Quarter-finals → Semi-finals
  "ko-QUARTER_FINAL-1": { winner: ["ko-SEMI_FINAL-1", "home"] },
  "ko-QUARTER_FINAL-2": { winner: ["ko-SEMI_FINAL-1", "away"] },
  "ko-QUARTER_FINAL-3": { winner: ["ko-SEMI_FINAL-2", "home"] },
  "ko-QUARTER_FINAL-4": { winner: ["ko-SEMI_FINAL-2", "away"] },
  // Semi-finals → Final (winner) + Third-place play-off (loser)
  "ko-SEMI_FINAL-1": { winner: ["ko-FINAL-1", "home"], loser: ["ko-THIRD_PLACE-1", "home"] },
  "ko-SEMI_FINAL-2": { winner: ["ko-FINAL-1", "away"], loser: ["ko-THIRD_PLACE-1", "away"] },
};

/**
 * After a knockout result, place the winner (and SF loser) into the correct
 * next fixture per the official 2026 bracket. Draws are skipped (a penalty
 * shootout winner is assigned manually).
 */
export async function advanceKnockoutWinner(matchId: string) {
  const m = await prisma.match.findUnique({ where: { id: matchId } });
  if (!m || m.phase !== "KNOCKOUT") return;
  if (m.homeScore == null || m.awayScore == null) return;
  if (m.homeScore === m.awayScore) return; // shootout → manual
  if (!m.homeTeamId || !m.awayTeamId) return;

  const link = BRACKET[m.id];
  if (!link) return;

  const homeWon = m.homeScore > m.awayScore;
  const winnerId = homeWon ? m.homeTeamId : m.awayTeamId;
  const loserId = homeWon ? m.awayTeamId : m.homeTeamId;

  const place = (target: string, slot: Slot, teamId: string) =>
    prisma.match.updateMany({
      where: { id: target },
      data: slot === "home" ? { homeTeamId: teamId } : { awayTeamId: teamId },
    });

  await place(link.winner[0], link.winner[1], winnerId);
  if (link.loser) await place(link.loser[0], link.loser[1], loserId);
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
