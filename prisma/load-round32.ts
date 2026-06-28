// One-off: load the official Round-of-32 matchups onto the bracket.
//
// Run AFTER the group stage is complete and the official draw is known. The
// seed leaves knockout teams TBD on purpose; this fills the 16 R32 fixtures
// (ko-ROUND_OF_32-1..16) with real teams. From there the live worker pulls
// scores and `advanceKnockoutWinner` fills R16 → Final automatically.
//
//   DATABASE_URL=<prod> npx tsx prisma/load-round32.ts [path/to/round32.json]
//
// Input JSON shape — one entry per R32 match, keyed by its chronological
// number n (1..16, matching the seed's `ko-ROUND_OF_32-${n}` ids and the
// `slot` order in prisma/schedule.ts):
//   { "1": { "home": "Argentina", "away": "Italy" }, "2": { ... }, ... }
//
// Names are matched leniently (accents/aliases via worker/normalize `canon`),
// so "Korea Republic", "Türkiye", "Cabo Verde" etc. all resolve.
//
// Safety: when finished group results exist in the target DB, every assignment
// is cross-checked against the computed standings (Winner X / Runner-up Y /
// 3rd of an allowed group). Mismatches are reported and abort the write unless
// you pass --force, so a mis-ordered scrape can't silently corrupt scoring.

import { prisma } from "../src/lib/prisma";
import { computeGroupStandings } from "../src/lib/standings";
import { canon } from "../worker/normalize";
import { readFileSync } from "fs";
import { KNOCKOUT_FIXTURES } from "./schedule";

type Pair = { home: string; away: string };

const args = process.argv.slice(2);
const force = args.includes("--force");
const jsonPath = args.find((a) => !a.startsWith("--")) ?? "prisma/round32.json";

const R32_SLOTS = KNOCKOUT_FIXTURES.filter((f) => f.round === "ROUND_OF_32").map((f) => f.slot);

async function main() {
  const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as Record<string, Pair>;

  // teamId lookup by canonical name
  const teams = await prisma.nationalTeam.findMany({ select: { id: true, name: true } });
  const idByCanon = new Map(teams.map((t) => [canon(t.name), t.id] as const));
  const nameById = new Map(teams.map((t) => [t.id, t.name] as const));
  const resolve = (n: string) => {
    const id = idByCanon.get(canon(n));
    if (!id) throw new Error(`Unknown team "${n}" — no NationalTeam matches (canon="${canon(n)}")`);
    return id;
  };

  // Optional: standings-based expectations (only if results are present)
  const standings = await computeGroupStandings();
  const anyFinished = [...standings.values()].some((rows) => rows.some((r) => r.played > 0));
  // Validate an assigned team against a slot token. Returns an error string on
  // mismatch, or null when it's fine (or can't be checked without results).
  const checkToken = (token: string, gotId: string): string | null => {
    let m: RegExpMatchArray | null;
    if ((m = token.match(/^Winner ([A-L])$/))) {
      const r = standings.get(m[1])?.[0];
      return r && r.teamId !== gotId ? `expects ${r.name} (Winner ${m[1]})` : null;
    }
    if ((m = token.match(/^Runner-up ([A-L])$/))) {
      const r = standings.get(m[1])?.[1];
      return r && r.teamId !== gotId ? `expects ${r.name} (Runner-up ${m[1]})` : null;
    }
    if ((m = token.match(/^3rd ([A-L/]+)$/))) {
      // Must be the 3rd-placed team of one of the allowed groups.
      const groups = m[1].split("/");
      const ok = groups.some((g) => standings.get(g)?.[2]?.teamId === gotId);
      if (ok) return null;
      const thirds = groups
        .map((g) => standings.get(g)?.[2]?.name)
        .filter(Boolean)
        .join(", ");
      return `is not the 3rd-placed team of any allowed group (${m[1]}; thirds: ${thirds})`;
    }
    return null;
  };

  const warnings: string[] = [];
  const plan: { id: string; homeId: string; awayId: string; slot: string; line: string }[] = [];

  for (let n = 1; n <= 16; n++) {
    const entry = raw[String(n)];
    if (!entry) throw new Error(`round32.json is missing entry "${n}" (need all of 1..16)`);
    const id = `ko-ROUND_OF_32-${n}`;
    const slot = R32_SLOTS[n - 1];
    const homeId = resolve(entry.home);
    const awayId = resolve(entry.away);

    // cross-check against standings when we have results
    if (anyFinished) {
      const [homeTok, awayTok] = slot.split(" vs ");
      for (const [tok, gotId, side] of [
        [homeTok, homeId, "home"],
        [awayTok, awayId, "away"],
      ] as const) {
        const err = checkToken(tok, gotId);
        if (err) {
          warnings.push(`  #${n} ${side} (${nameById.get(gotId)}): slot "${tok}" ${err}`);
        }
      }
    }

    plan.push({
      id,
      homeId,
      awayId,
      slot,
      line: `  #${String(n).padStart(2)} [${slot}]  ${nameById.get(homeId)}  vs  ${nameById.get(awayId)}`,
    });
  }

  console.log(`\n🏆  Round of 32 — ${plan.length} matchups from ${jsonPath}:`);
  for (const p of plan) console.log(p.line);

  if (warnings.length) {
    console.log(`\n⚠️   ${warnings.length} assignment(s) disagree with the group standings:`);
    for (const w of warnings) console.log(w);
    if (!force) {
      console.log(`\n❌  Aborted. Fix round32.json, or re-run with --force to override.\n`);
      await prisma.$disconnect();
      process.exit(1);
    }
    console.log(`\n⚠️   --force set: writing anyway.`);
  } else if (anyFinished) {
    console.log(`\n✅  All Winner/Runner-up assignments match the computed standings.`);
  } else {
    console.log(`\nℹ️   No finished group results in this DB — skipped the standings cross-check.`);
  }

  for (const p of plan) {
    await prisma.match.update({
      where: { id: p.id },
      data: { homeTeamId: p.homeId, awayTeamId: p.awayId },
    });
  }
  console.log(`\n✅  Wrote teams onto ${plan.length} Round-of-32 fixtures.`);
  console.log(`   Next: \`npm run worker:map\` then \`npm run worker:poll\` to pull live scores.\n`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\n❌ ", e instanceof Error ? e.message : e, "\n");
  await prisma.$disconnect();
  process.exit(1);
});
