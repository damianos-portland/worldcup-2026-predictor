import { prisma } from "@/lib/prisma";

export type TeamStanding = {
  teamId: string;
  name: string;
  code: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

/**
 * Compute live group standings from finished group-stage results.
 * Sorted by points, then goal difference, then goals for, then name.
 */
export async function computeGroupStandings(): Promise<Map<string, TeamStanding[]>> {
  const [teams, matches] = await Promise.all([
    prisma.nationalTeam.findMany({ where: { group: { not: null } } }),
    prisma.match.findMany({
      where: { phase: "GROUP", status: "FINISHED" },
    }),
  ]);

  const table = new Map<string, TeamStanding>();
  for (const t of teams) {
    table.set(t.id, {
      teamId: t.id,
      name: t.name,
      code: t.code,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    if (
      m.homeScore == null ||
      m.awayScore == null ||
      !m.homeTeamId ||
      !m.awayTeamId
    )
      continue;
    const home = table.get(m.homeTeamId);
    const away = table.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played++; away.played++;
    home.gf += m.homeScore; home.ga += m.awayScore;
    away.gf += m.awayScore; away.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++; home.points += 3; away.lost++;
    } else if (m.homeScore < m.awayScore) {
      away.won++; away.points += 3; home.lost++;
    } else {
      home.drawn++; away.drawn++; home.points++; away.points++;
    }
  }

  const byGroup = new Map<string, TeamStanding[]>();
  for (const t of teams) {
    const g = t.group!;
    const row = table.get(t.id)!;
    row.gd = row.gf - row.ga;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(row);
  }

  for (const [, rows] of byGroup) {
    rows.sort(
      (a, b) =>
        b.points - a.points ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        a.name.localeCompare(b.name)
    );
  }

  // Return groups in alphabetical order
  return new Map([...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
