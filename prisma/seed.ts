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

async function main() {
  console.log("🌍  Seeding World Cup 2026 Predictor League...");

  // ---- Reset tournament + competition data (keep idempotent) ----
  await prisma.prediction.deleteMany();
  await prisma.topScorerPick.deleteMany();
  await prisma.tournamentWinnerPick.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.nationalTeam.deleteMany();

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
  console.log(`👤  Admin ready → ${adminEmail} / ${adminPassword}`);

  // ---- National teams + players ----
  const teamIdByName = new Map<string, string>();
  for (const t of TEAMS) {
    const team = await prisma.nationalTeam.create({
      data: {
        name: t.name,
        code: t.code,
        group: t.group,
        players: { create: t.players.map((name) => ({ name })) },
      },
    });
    teamIdByName.set(t.name, team.id);
  }
  console.log(`🏳️   Created ${TEAMS.length} national teams + players`);

  // ---- Group stage fixtures (72 matches) ----
  let groupMatchCount = 0;
  let matchdayDay = [0, 5, 11]; // MD1, MD2, MD3 day offsets
  for (let g = 0; g < GROUPS.length; g++) {
    const group = GROUPS[g];
    const groupTeams = TEAMS.filter((t) => t.group === group);
    for (let md = 0; md < ROUND_ROBIN.length; md++) {
      const fixtures = ROUND_ROBIN[md];
      for (let f = 0; f < fixtures.length; f++) {
        const [hi, ai] = fixtures[f];
        const dayOffset = matchdayDay[md] + Math.floor(g / 3);
        const hour = 13 + ((g % 3) * 3 + f) % 9;
        await prisma.match.create({
          data: {
            round: RoundType.GROUP,
            phase: Phase.GROUP,
            group,
            homeTeamId: teamIdByName.get(groupTeams[hi].name)!,
            awayTeamId: teamIdByName.get(groupTeams[ai].name)!,
            kickoff: tournamentDate(dayOffset, hour),
            venue: `Group ${group} Stadium`,
            status: MatchStatus.UPCOMING,
            matchday: md + 1,
            // Mark the headline opener of each matchday set as a Golden Match demo
            isGolden: g === 0 && md === 0 && f === 0,
          },
        });
        groupMatchCount++;
      }
    }
  }
  console.log(`⚽  Created ${groupMatchCount} group-stage matches`);

  // ---- Knockout placeholder fixtures (teams filled in by admin later) ----
  let knockoutCount = 0;
  for (const r of KNOCKOUT_ROUNDS) {
    for (let i = 0; i < r.count; i++) {
      await prisma.match.create({
        data: {
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
  console.log(`🏆  Created ${knockoutCount} knockout fixtures`);

  // ---- Hall of Fame demo entries (previous seasons) ----
  await prisma.hallOfFame.deleteMany();
  await prisma.hallOfFame.createMany({
    data: [
      { leagueName: "Office Legends", season: "2022", winnerTeam: "Tiki-Taka Titans", winnerName: "Maria S.", winnerPoints: 412, runnerUp: "Goal Machines" },
      { leagueName: "Family Cup", season: "2018", winnerTeam: "The Underdogs", winnerName: "Jon P.", winnerPoints: 388, runnerUp: "Net Busters" },
    ],
  });

  // ---- Demo league so the platform is explorable out of the box ----
  await prisma.league.upsert({
    where: { code: "DEMOL-EAGUE" },
    update: {},
    create: { name: "Demo Champions League", code: "DEMOL-EAGUE", season: "2026" },
  });
  console.log("🎟️   Demo league code → DEMOL-EAGUE");

  console.log("✅  Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
