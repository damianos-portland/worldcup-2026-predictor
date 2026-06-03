import { PrismaClient, Phase, RoundType, MatchStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  TEAMS,
  GROUPS,
  ROUND_ROBIN,
  KNOCKOUT_ROUNDS,
} from "./tournament-data";

const prisma = new PrismaClient();

// Base date: tournament kicks off June 11, 2026
function tournamentDate(dayOffset: number, hour = 18): Date {
  const d = new Date(Date.UTC(2026, 5, 11, hour, 0, 0));
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d;
}

// Stable, deterministic match IDs so re-seeding UPDATES rows in place
// (instead of delete + recreate) — this is what preserves user predictions.
const groupMatchId = (group: string, md: number, fixture: number) =>
  `grp-${group}-md${md + 1}-g${fixture + 1}`;
const knockoutMatchId = (round: string, index: number) =>
  `ko-${round}-${index + 1}`;

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

  // ---- Group-stage fixtures (72) — upsert by deterministic ID ----
  const matchdayDay = [0, 5, 11]; // MD1, MD2, MD3 day offsets
  let groupMatchCount = 0;
  for (let g = 0; g < GROUPS.length; g++) {
    const group = GROUPS[g];
    const groupTeams = TEAMS.filter((t) => t.group === group);
    for (let md = 0; md < ROUND_ROBIN.length; md++) {
      const fixtures = ROUND_ROBIN[md];
      for (let f = 0; f < fixtures.length; f++) {
        const [hi, ai] = fixtures[f];
        const dayOffset = matchdayDay[md] + Math.floor(g / 3);
        const hour = 13 + (((g % 3) * 3 + f) % 9);
        const id = groupMatchId(group, md, f);
        const data = {
          round: RoundType.GROUP,
          phase: Phase.GROUP,
          group,
          homeTeamId: teamIdByName.get(groupTeams[hi].name)!,
          awayTeamId: teamIdByName.get(groupTeams[ai].name)!,
          kickoff: tournamentDate(dayOffset, hour),
          venue: `Group ${group} Stadium`,
          matchday: md + 1,
          // One Golden Match per group: the group's opening fixture.
          isGolden: md === 0 && f === 0,
        };
        await prisma.match.upsert({
          where: { id },
          // Note: status/scores are intentionally NOT updated, so entered
          // results (and their predictions) survive a re-seed.
          update: data,
          create: { id, status: MatchStatus.UPCOMING, ...data },
        });
        groupMatchCount++;
      }
    }
  }
  console.log(`⚽  Synced ${groupMatchCount} group-stage matches`);

  // ---- Knockout placeholders (32) — upsert by deterministic ID ----
  let knockoutCount = 0;
  for (const r of KNOCKOUT_ROUNDS) {
    for (let i = 0; i < r.count; i++) {
      const id = knockoutMatchId(r.round, i);
      await prisma.match.upsert({
        where: { id },
        // Don't overwrite home/away team — the admin assigns those as the
        // bracket fills in. Only structure + golden flag are refreshed.
        update: {
          round: r.round as RoundType,
          phase: Phase.KNOCKOUT,
          slot: `${r.round.replaceAll("_", " ")} #${i + 1}`,
          kickoff: tournamentDate(r.baseDay, 16 + (i % 4)),
          venue: "Knockout Venue",
          isGolden: r.round === "FINAL",
        },
        create: {
          id,
          round: r.round as RoundType,
          phase: Phase.KNOCKOUT,
          slot: `${r.round.replaceAll("_", " ")} #${i + 1}`,
          kickoff: tournamentDate(r.baseDay, 16 + (i % 4)),
          venue: "Knockout Venue",
          status: MatchStatus.UPCOMING,
          matchday: 1,
          isGolden: r.round === "FINAL",
        },
      });
      knockoutCount++;
    }
  }
  console.log(`🏆  Synced ${knockoutCount} knockout fixtures`);

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
