// One-off: map our fixtures to ESPN event ids (writes Match.sourceEventId).
// Run at tournament start, and again after each knockout draw fills in teams.
//   npm run worker:map
import { prisma } from "../src/lib/prisma";
import { fetchScoreboard, dateRange, type EspnEvent } from "./espn";
import { pairKey } from "./normalize";

async function main() {
  const matches = await prisma.match.findMany({ include: { homeTeam: true, awayTeam: true } });
  if (!matches.length) {
    console.log("No matches in the DB — seed the schedule first.");
    return;
  }

  // Sweep every UTC date the tournament spans and collect ESPN's fixtures.
  const kickoffs = matches.map((m) => m.kickoff);
  const start = new Date(Math.min(...kickoffs.map((k) => k.getTime())));
  const end = new Date(Math.max(...kickoffs.map((k) => k.getTime())));
  const dates = dateRange(start, end);
  console.log(`🔎  Fetching ESPN fixtures across ${dates.length} dates (${dates[0]}–${dates[dates.length - 1]})…`);

  const byId = new Map<string, EspnEvent>();
  for (const date of dates) {
    const events = await fetchScoreboard(date).catch(() => [] as EspnEvent[]);
    for (const ev of events) byId.set(ev.id, ev);
  }
  const espnEvents = [...byId.values()];
  console.log(`   Found ${espnEvents.length} ESPN fixtures.`);

  // Index by order-insensitive team pair; keep all (knockout pairs can repeat).
  const byPair = new Map<string, EspnEvent[]>();
  for (const ev of espnEvents) {
    if (!ev.homeName || !ev.awayName) continue;
    const key = pairKey(ev.homeName, ev.awayName);
    const list = byPair.get(key) ?? [];
    list.push(ev);
    byPair.set(key, list);
  }

  let mapped = 0;
  let pending = 0;
  const misses: string[] = [];

  for (const m of matches) {
    if (!m.homeTeam || !m.awayTeam) {
      pending++; // knockout fixture with teams still TBD
      continue;
    }
    const cands = byPair.get(pairKey(m.homeTeam.name, m.awayTeam.name)) ?? [];
    if (!cands.length) {
      misses.push(`${m.homeTeam.name} vs ${m.awayTeam.name}`);
      continue;
    }
    // If a pair appears more than once (knockouts), pick the nearest kickoff.
    const best = cands.reduce((a, b) =>
      Math.abs(new Date(a.dateISO).getTime() - m.kickoff.getTime()) <=
      Math.abs(new Date(b.dateISO).getTime() - m.kickoff.getTime())
        ? a
        : b
    );
    await prisma.match.update({ where: { id: m.id }, data: { sourceEventId: best.id } });
    mapped++;
  }

  console.log(`✅  Mapped ${mapped} fixtures · ${pending} awaiting teams (knockouts) · ${misses.length} unmatched.`);
  if (misses.length) {
    console.log("⚠️  Unmatched (add team-name aliases in worker/normalize.ts):");
    misses.forEach((x) => console.log("   - " + x));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
