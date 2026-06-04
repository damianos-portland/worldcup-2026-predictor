"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { recalculateLeague } from "@/lib/scoring";
import { generateLeagueCode } from "@/lib/utils";

async function recalcAllLeagues() {
  const leagues = await prisma.league.findMany({ select: { id: true } });
  for (const l of leagues) await recalculateLeague(l.id);
}

async function notifyLeague(leagueId: string, title: string, message: string, type: any = "GENERIC") {
  const members = await prisma.membership.findMany({
    where: { leagueId },
    select: { userId: true },
  });
  if (members.length === 0) return;
  await prisma.notification.createMany({
    data: members.map((m) => ({ userId: m.userId, title, message, type })),
  });
}

/** Create a new league with a unique auto-generated code. */
export async function createLeague(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "League name is required." };

  let code = generateLeagueCode();
  // ensure uniqueness
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.league.findUnique({ where: { code } });
    if (!clash) break;
    code = generateLeagueCode();
  }

  const league = await prisma.league.create({ data: { name, code } });
  revalidatePath("/admin");
  return { success: true, code: league.code };
}

/** Enter / update an official match result, then recalculate every league. */
export async function enterResult(formData: FormData) {
  await requireAdmin();
  const matchId = formData.get("matchId") as string;
  const homeScore = parseInt(formData.get("homeScore") as string, 10);
  const awayScore = parseInt(formData.get("awayScore") as string, 10);

  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return { error: "Enter both scores." };
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, status: "FINISHED" },
  });

  await recalcAllLeagues();
  revalidatePath("/admin");
  return { success: true };
}

/** Change match status (Upcoming / Locked / Finished). */
export async function setMatchStatus(formData: FormData) {
  await requireAdmin();
  const matchId = formData.get("matchId") as string;
  const status = formData.get("status") as "UPCOMING" | "LOCKED" | "FINISHED";
  await prisma.match.update({ where: { id: matchId }, data: { status } });

  if (status === "LOCKED") {
    const leagues = await prisma.league.findMany({ select: { id: true } });
    for (const l of leagues)
      await notifyLeague(l.id, "Predictions Locked", "A match has been locked. No more changes.", "PREDICTIONS_LOCKED");
  }
  revalidatePath("/admin");
  return { success: true };
}

/** Mark exactly one Golden Match per round. */
export async function markGoldenMatch(formData: FormData) {
  await requireAdmin();
  const matchId = formData.get("matchId") as string;
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Match not found." };

  // Group stage → one Golden Match per group. Knockouts → one per round.
  const scope =
    match.phase === "GROUP" && match.group
      ? { phase: "GROUP" as const, group: match.group, isGolden: true }
      : { round: match.round, isGolden: true };
  await prisma.match.updateMany({ where: scope, data: { isGolden: false } });
  await prisma.match.update({ where: { id: matchId }, data: { isGolden: true } });
  await recalcAllLeagues();
  revalidatePath("/admin");
  return { success: true };
}

/** Assign teams to a knockout fixture. */
export async function setKnockoutTeams(formData: FormData) {
  await requireAdmin();
  const matchId = formData.get("matchId") as string;
  const homeTeamId = (formData.get("homeTeamId") as string) || null;
  const awayTeamId = (formData.get("awayTeamId") as string) || null;
  await prisma.match.update({
    where: { id: matchId },
    data: { homeTeamId, awayTeamId },
  });
  revalidatePath("/admin");
  return { success: true };
}

/** Toggle whether a national team has been eliminated (enables replacements). */
export async function setTeamEliminated(formData: FormData) {
  await requireAdmin();
  const teamId = formData.get("teamId") as string;
  const eliminated = formData.get("eliminated") === "true";
  await prisma.nationalTeam.update({ where: { id: teamId }, data: { eliminated } });
  revalidatePath("/admin");
  return { success: true };
}

/** Set the tournament top scorer (awards the bonus on recalc). */
export async function setTopScorer(formData: FormData) {
  await requireAdmin();
  const playerId = formData.get("playerId") as string;
  await prisma.player.updateMany({ data: { isTopScorer: false } });
  if (playerId) {
    await prisma.player.update({ where: { id: playerId }, data: { isTopScorer: true } });
  }
  await recalcAllLeagues();
  revalidatePath("/admin");
  return { success: true };
}

/** Open or close phases for a league. */
export async function setLeaguePhase(formData: FormData) {
  await requireAdmin();
  const leagueId = formData.get("leagueId") as string;
  const action = formData.get("action") as
    | "LOCK_GROUP"
    | "UNLOCK_GROUP"
    | "OPEN_KNOCKOUT"
    | "LOCK_KNOCKOUT"
    | "UNLOCK_KNOCKOUT"
    | "FINISH";

  if (action === "LOCK_GROUP") {
    await prisma.league.update({
      where: { id: leagueId },
      data: { groupLocked: true },
    });
    await notifyLeague(leagueId, "Group Stage Locked", "The group stage is now locked.", "PREDICTIONS_LOCKED");
  } else if (action === "UNLOCK_GROUP") {
    await prisma.league.update({
      where: { id: leagueId },
      data: { groupLocked: false },
    });
    await notifyLeague(leagueId, "Group Stage Reopened", "The admin has reopened the group stage — picks are editable again.", "GENERIC");
  } else if (action === "OPEN_KNOCKOUT") {
    await prisma.league.update({
      where: { id: leagueId },
      data: { phase: "KNOCKOUT", knockoutOpen: true, groupLocked: true },
    });
    await notifyLeague(leagueId, "Phase 2 Opened", "The knockout prediction phase is now open!", "PHASE_TWO_OPENED");
  } else if (action === "LOCK_KNOCKOUT") {
    await prisma.league.update({
      where: { id: leagueId },
      data: { knockoutLocked: true },
    });
    await notifyLeague(leagueId, "Knockout Stage Locked", "The knockout stage is locked — predictions and replacements are final.", "PREDICTIONS_LOCKED");
  } else if (action === "UNLOCK_KNOCKOUT") {
    await prisma.league.update({
      where: { id: leagueId },
      data: { knockoutLocked: false },
    });
    await notifyLeague(leagueId, "Knockout Stage Reopened", "The admin has reopened the knockout stage.", "GENERIC");
  } else if (action === "FINISH") {
    await prisma.league.update({
      where: { id: leagueId },
      data: { phase: "FINISHED" },
    });
    await notifyLeague(leagueId, "Tournament Completed", "The tournament is complete. Check the final standings!", "TOURNAMENT_COMPLETED");
  }

  await recalculateLeague(leagueId);
  revalidatePath("/admin");
  return { success: true };
}

/** Force a full recalculation (handy after manual fixes). */
export async function recalcLeagueAction(formData: FormData) {
  await requireAdmin();
  const leagueId = formData.get("leagueId") as string;
  await recalculateLeague(leagueId);
  await notifyLeague(leagueId, "Ranking Update", "Standings have been recalculated.", "RANKING_UPDATE");
  revalidatePath("/admin");
  return { success: true };
}
