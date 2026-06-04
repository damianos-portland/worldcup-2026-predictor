import { prisma } from "@/lib/prisma";
import { scorePrediction } from "@/lib/scoring";

/** Matches currently in progress, with teams + ordered events for the ticker. */
export async function getLiveMatches() {
  return prisma.match.findMany({
    where: { status: "LIVE" },
    include: {
      homeTeam: true,
      awayTeam: true,
      events: { orderBy: { sortKey: "asc" } },
    },
    orderBy: { kickoff: "asc" },
  });
}

export type LiveRow = {
  membershipId: string;
  teamName: string;
  managerName: string;
  finalizedPoints: number;
  provisional: number;
  liveTotal: number;
  currentRank: number;
  projectedRank: number;
};

/**
 * Live standings = each member's finalized points plus PROVISIONAL points from
 * matches currently in progress (scored as if the live score were final).
 * Nothing is persisted — this is computed on read.
 */
export async function computeLiveStandings(leagueId: string): Promise<LiveRow[]> {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return [];

  const liveMatches = await prisma.match.findMany({ where: { status: "LIVE" } });
  const liveById = new Map(liveMatches.map((m) => [m.id, m]));
  const liveIds = [...liveById.keys()];

  const members = await prisma.membership.findMany({
    where: { leagueId },
    include: {
      user: true,
      predictions: liveIds.length
        ? { where: { matchId: { in: liveIds } } }
        : false,
    },
  });

  const rows: LiveRow[] = members.map((m) => {
    let provisional = 0;
    for (const p of (m as any).predictions ?? []) {
      const match = liveById.get(p.matchId);
      if (!match || match.liveHomeScore == null || match.liveAwayScore == null) continue;
      const bd = scorePrediction(
        p,
        { homeScore: match.liveHomeScore, awayScore: match.liveAwayScore, isGolden: match.isGolden },
        league
      );
      provisional += bd.points;
    }
    return {
      membershipId: m.id,
      teamName: m.teamName,
      managerName: m.user.name,
      finalizedPoints: m.totalPoints,
      provisional,
      liveTotal: m.totalPoints + provisional,
      currentRank: m.currentRank,
      projectedRank: 0,
    };
  });

  rows.sort((a, b) => b.liveTotal - a.liveTotal || a.currentRank - b.currentRank);
  rows.forEach((r, i) => (r.projectedRank = i + 1));
  return rows;
}
