import { prisma } from "@/lib/prisma";
import { matchdayKey, matchdayLabel } from "@/lib/matchday";

export type H2HRow = {
  membershipId: string;
  teamName: string;
  managerName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
};

export type H2HFixture = {
  matchdayKey: string;
  label: string;
  results: { home: string; away: string; homePts: number; awayPts: number; outcome: "HOME" | "AWAY" | "DRAW" }[];
};

/**
 * Round-robin pairings via the circle method. Each matchday is a fixed round,
 * so everyone plays a different opponent each week (a BYE for odd counts).
 */
function pairingsForRound(ids: string[], round: number): [string | null, string | null][] {
  const arr: (string | null)[] = [...ids];
  if (arr.length % 2 === 1) arr.push(null); // bye slot
  const m = arr.length;
  if (m < 2) return [];
  const rotation = round % (m - 1);
  const fixed = arr[0];
  const rest = arr.slice(1);
  const rotated = [...rest.slice(rest.length - rotation), ...rest.slice(0, rest.length - rotation)];
  const lineup = [fixed, ...rotated];
  const pairs: [string | null, string | null][] = [];
  for (let i = 0; i < m / 2; i++) pairs.push([lineup[i], lineup[m - 1 - i]]);
  return pairs;
}

/**
 * A SECOND competition alongside the points table: each completed matchday,
 * members are paired 1v1 and whoever scored more prediction points that
 * matchday wins (3 / 1 / 0). Computed live from existing data — no extra tables.
 */
export async function computeH2H(
  leagueId: string
): Promise<{ rows: H2HRow[]; fixtures: H2HFixture[] }> {
  const members = await prisma.membership.findMany({
    where: { leagueId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });
  if (members.length < 2) return { rows: [], fixtures: [] };

  const matches = await prisma.match.findMany({
    select: { id: true, kickoff: true, status: true },
  });
  const keyInfo = new Map<string, { ids: Set<string>; allFinished: boolean }>();
  for (const mt of matches) {
    const key = matchdayKey(mt);
    if (!keyInfo.has(key)) keyInfo.set(key, { ids: new Set(), allFinished: true });
    const e = keyInfo.get(key)!;
    e.ids.add(mt.id);
    if (mt.status !== "FINISHED") e.allFinished = false;
  }

  const preds = await prisma.prediction.findMany({
    where: { membership: { leagueId }, scored: true },
    select: { membershipId: true, matchId: true, points: true },
  });

  const stand = new Map<string, H2HRow>(
    members.map((m) => [m.id, {
      membershipId: m.id, teamName: m.teamName, managerName: m.user.name,
      played: 0, won: 0, drawn: 0, lost: 0, points: 0,
    }])
  );
  const fixtures: H2HFixture[] = [];
  const memberIds = members.map((m) => m.id);

  // All matchday dates in chronological order; each is a fixed H2H "round".
  const allKeys = [...keyInfo.keys()].sort();
  const completedKeys = allKeys.filter((k) => keyInfo.get(k)?.allFinished);

  for (const key of completedKeys) {
    const round = allKeys.indexOf(key);
    const ids = keyInfo.get(key)!.ids;

    const mp = new Map<string, number>(memberIds.map((id) => [id, 0]));
    for (const p of preds) {
      if (ids.has(p.matchId)) mp.set(p.membershipId, (mp.get(p.membershipId) ?? 0) + p.points);
    }

    const results: H2HFixture["results"] = [];
    for (const [a, b] of pairingsForRound(memberIds, round)) {
      if (!a || !b) continue; // bye — sits out this round
      const pa = mp.get(a) ?? 0;
      const pb = mp.get(b) ?? 0;
      const sa = stand.get(a)!;
      const sb = stand.get(b)!;
      sa.played++; sb.played++;
      let outcome: "HOME" | "AWAY" | "DRAW";
      if (pa > pb) { sa.won++; sa.points += 3; sb.lost++; outcome = "HOME"; }
      else if (pa < pb) { sb.won++; sb.points += 3; sa.lost++; outcome = "AWAY"; }
      else { sa.drawn++; sb.drawn++; sa.points++; sb.points++; outcome = "DRAW"; }
      results.push({ home: sa.teamName, away: sb.teamName, homePts: pa, awayPts: pb, outcome });
    }
    fixtures.push({ matchdayKey: key, label: matchdayLabel(key), results });
  }

  const rows = [...stand.values()].sort(
    (x, y) => y.points - x.points || y.won - x.won || x.teamName.localeCompare(y.teamName)
  );
  return { rows, fixtures: fixtures.reverse() }; // most recent matchday first
}
