// One-off: map our fixtures to Sofascore event IDs (writes Match.sourceEventId).
// Run at tournament start, and again after each knockout draw fills in teams.
//   npm run worker:map
import { prisma } from "../src/lib/prisma";
import { getSeasonFixtures } from "./sofascore";
import { pairKey } from "./normalize";

const TOURNAMENT_ID = parseInt(process.env.WC_TOURNAMENT_ID || "16", 10);
const SEASON_ID = parseInt(process.env.WC_SEASON_ID || "58210", 10);

async function main() {
  console.log(`🔎  Fetching Sofascore fixtures (tournament ${TOURNAMENT_ID}, season ${SEASON_ID})…`);
  const fixtures = await getSeasonFixtures(TOURNAMENT_ID, SEASON_ID);
  console.log(`   Found ${fixtures.length} Sofascore fixtures.`);
  const byPair = new Map(fixtures.map((f) => [pairKey(f.home, f.away), f]));

  const matches = await prisma.match.findMany({ include: { homeTeam: true, awayTeam: true } });
  let mapped = 0;
  let pending = 0;
  const misses: string[] = [];

  for (const m of matches) {
    if (!m.homeTeam || !m.awayTeam) {
      pending++; // knockout fixture with teams still TBD
      continue;
    }
    const f = byPair.get(pairKey(m.homeTeam.name, m.awayTeam.name));
    if (f) {
      await prisma.match.update({ where: { id: m.id }, data: { sourceEventId: String(f.id) } });
      mapped++;
    } else {
      misses.push(`${m.homeTeam.name} vs ${m.awayTeam.name}`);
    }
  }

  console.log(`✅  Mapped ${mapped} fixtures · ${pending} awaiting teams (knockouts) · ${misses.length} unmatched.`);
  if (misses.length) {
    console.log("⚠️  Unmatched (check team-name aliases in worker/normalize.ts):");
    misses.forEach((x) => console.log("   - " + x));
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
