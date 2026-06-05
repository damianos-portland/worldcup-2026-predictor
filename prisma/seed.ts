import { PrismaClient, Phase, RoundType, MatchStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TEAMS } from "./tournament-data";
import { GROUP_FIXTURES, KNOCKOUT_FIXTURES } from "./schedule";

const prisma = new PrismaClient();

async function main() {
  console.log("🌍  Seeding World Cup 2026 Predictor League (non-destructive)...");

  // ---- Admin user ----
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@worldcup.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: process.env.ADMIN_NAME || "Tournament Director",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
    },
  });
  console.log(`👤  Admin ready → ${adminEmail}`);

  // ---- National teams + players (upsert by unique name; keep stable IDs) ----
  const teamIdByName = new Map<string, string>();
  for (const t of TEAMS) {
    const team = await prisma.nationalTeam.upsert({
      where: { name: t.name },
      // Don't touch `eliminated` — that's live admin state.
      update: { code: t.code, group: t.group },
      create: { name: t.name, code: t.code, group: t.group },
    });
    teamIdByName.set(t.name, team.id);

    for (const playerName of t.players) {
      await prisma.player.upsert({
        where: { name_nationalTeamId: { name: playerName, nationalTeamId: team.id } },
        update: {},
        create: { name: playerName, nationalTeamId: team.id },
      });
    }
    // Remove players no longer in the squad list — but only if nobody picked them.
    await prisma.player.deleteMany({
      where: {
        nationalTeamId: team.id,
        name: { notIn: t.players },
        topScorerPicks: { none: {} },
      },
    });
  }
  console.log(`🏳️   Synced ${TEAMS.length} national teams + players`);

  const groupByName = new Map(TEAMS.map((t) => [t.name, t.group]));
  const desiredIds = new Set<string>();

  // ---- Group-stage fixtures (real schedule) — upsert by deterministic ID ----
  // One Golden Match per group: each group's earliest fixture (the list is in
  // matchday/chronological order, so the first one seen per group is earliest).
  const goldenGroupSeen = new Set<string>();
  let groupMatchCount = 0;
  for (let i = 0; i < GROUP_FIXTURES.length; i++) {
    const fx = GROUP_FIXTURES[i];
    const group = groupByName.get(fx.home);
    if (!group) throw new Error(`Unknown team in schedule: ${fx.home}`);
    const id = `g-${i + 1}`;
    desiredIds.add(id);
    const isGolden = !goldenGroupSeen.has(group);
    goldenGroupSeen.add(group);
    const data = {
      round: RoundType.GROUP,
      phase: Phase.GROUP,
      group,
      homeTeamId: teamIdByName.get(fx.home)!,
      awayTeamId: teamIdByName.get(fx.away)!,
      kickoff: new Date(fx.kickoff),
      venue: fx.venue,
      matchday: Math.floor(i / 24) + 1, // 0-23 MD1, 24-47 MD2, 48-71 MD3
      isGolden,
    };
    await prisma.match.upsert({
      where: { id },
      update: data, // status/scores intentionally not touched
      create: { id, status: MatchStatus.UPCOMING, ...data },
    });
    groupMatchCount++;
  }
  console.log(`⚽  Synced ${groupMatchCount} group-stage matches (official schedule)`);

  // ---- Knockout fixtures (real dates/venues; teams TBD) ----
  const roundIndex = new Map<string, number>();
  let knockoutCount = 0;
  for (const fx of KNOCKOUT_FIXTURES) {
    const n = (roundIndex.get(fx.round) ?? 0) + 1;
    roundIndex.set(fx.round, n);
    const id = `ko-${fx.round}-${n}`;
    desiredIds.add(id);
    const data = {
      round: fx.round as RoundType,
      phase: Phase.KNOCKOUT,
      slot: fx.slot,
      kickoff: new Date(fx.kickoff),
      venue: fx.venue,
      isGolden: fx.round === "FINAL",
    };
    await prisma.match.upsert({
      where: { id },
      // Don't overwrite home/away team — the admin/worker fills the bracket.
      update: data,
      create: { id, status: MatchStatus.UPCOMING, matchday: 1, ...data },
    });
    knockoutCount++;
  }
  console.log(`🏆  Synced ${knockoutCount} knockout fixtures`);

  // ---- Remove any stale matches from previous (incorrect) schedules ----
  const stale = await prisma.match.findMany({
    where: { id: { notIn: [...desiredIds] } },
    select: { id: true },
  });
  if (stale.length) {
    await prisma.match.deleteMany({ where: { id: { in: stale.map((m) => m.id) } } });
    console.log(`🧹  Removed ${stale.length} stale fixtures from the old schedule`);
  }

  // ---- Hall of Fame demo entries (only seed once, never duplicate) ----
  if ((await prisma.hallOfFame.count()) === 0) {
    await prisma.hallOfFame.createMany({
      data: [
        { leagueName: "Office Legends", season: "2022", winnerTeam: "Tiki-Taka Titans", winnerName: "Maria S.", winnerPoints: 412, runnerUp: "Goal Machines" },
        { leagueName: "Family Cup", season: "2018", winnerTeam: "The Underdogs", winnerName: "Jon P.", winnerPoints: 388, runnerUp: "Net Busters" },
      ],
    });
  }

  // ---- Demo league (upsert so it's explorable out of the box) ----
  await prisma.league.upsert({
    where: { code: "DEMOL-EAGUE" },
    update: {},
    create: { name: "Demo Champions League", code: "DEMOL-EAGUE", season: "2026" },
  });
  console.log("🎟️   Demo league code → DEMOL-EAGUE");

  console.log("✅  Seed complete — predictions, results & leagues preserved.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
