"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { matchdayKey } from "@/lib/matchday";

async function memberOrThrow(leagueId: string) {
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId } },
  });
  if (!membership) throw new Error("You are not a member of this league.");
  return membership;
}

/** Save (or update) a single match prediction. Locked matches are rejected. */
export async function savePrediction(formData: FormData) {
  const leagueId = formData.get("leagueId") as string;
  const matchId = formData.get("matchId") as string;
  const homeScore = parseInt(formData.get("homeScore") as string, 10);
  const awayScore = parseInt(formData.get("awayScore") as string, 10);

  const membership = await memberOrThrow(leagueId);

  if (Number.isNaN(homeScore) || Number.isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
    return { error: "Enter valid scores." };
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Match not found." };
  if (match.status !== "UPCOMING") {
    return { error: "Predictions for this match are locked." };
  }
  if (match.phase === "KNOCKOUT") {
    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (league?.knockoutLocked) {
      return { error: "The knockout stage is locked — no more changes." };
    }
  }

  await prisma.prediction.upsert({
    where: { membershipId_matchId: { membershipId: membership.id, matchId } },
    create: { membershipId: membership.id, matchId, homeScore, awayScore },
    update: { homeScore, awayScore },
  });

  revalidatePath(`/leagues/${leagueId}/predictions`);
  return { success: true };
}

/** Toggle the Joker for a match (one per phase). */
export async function toggleJoker(formData: FormData) {
  const leagueId = formData.get("leagueId") as string;
  const matchId = formData.get("matchId") as string;
  const membership = await memberOrThrow(leagueId);

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== "UPCOMING") {
    return { error: "Joker can only be set before kickoff." };
  }

  const prediction = await prisma.prediction.findUnique({
    where: { membershipId_matchId: { membershipId: membership.id, matchId } },
  });
  if (!prediction) return { error: "Submit a prediction before using a Joker." };

  const phaseField = match.phase === "GROUP" ? "groupJokerUsed" : "knockoutJokerUsed";
  const alreadyUsedElsewhere = (membership as any)[phaseField] && !prediction.jokerUsed;

  if (prediction.jokerUsed) {
    // turning it off — free the joker
    await prisma.prediction.update({ where: { id: prediction.id }, data: { jokerUsed: false } });
    await prisma.membership.update({
      where: { id: membership.id },
      data: { [phaseField]: false },
    });
  } else {
    if (alreadyUsedElsewhere) {
      return { error: `You already used your ${match.phase === "GROUP" ? "Group" : "Knockout"} Joker on another match.` };
    }
    await prisma.prediction.update({ where: { id: prediction.id }, data: { jokerUsed: true } });
    await prisma.membership.update({
      where: { id: membership.id },
      data: { [phaseField]: true },
    });
  }

  revalidatePath(`/leagues/${leagueId}/predictions`);
  return { success: true };
}

/** Toggle the Power Pick (×1.5) for a match — only one per matchday/round. */
export async function togglePowerPick(formData: FormData) {
  const leagueId = formData.get("leagueId") as string;
  const matchId = formData.get("matchId") as string;
  const membership = await memberOrThrow(leagueId);

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== "UPCOMING") {
    return { error: "Power Pick can only be set before kickoff." };
  }
  if (match.phase === "KNOCKOUT") {
    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (league?.knockoutLocked) {
      return { error: "The knockout stage is locked — no more changes." };
    }
  }

  const prediction = await prisma.prediction.findUnique({
    where: { membershipId_matchId: { membershipId: membership.id, matchId } },
  });
  if (!prediction) return { error: "Submit a prediction before using a Power Pick." };

  if (prediction.powerPick) {
    await prisma.prediction.update({ where: { id: prediction.id }, data: { powerPick: false } });
  } else {
    // Clear any existing Power Pick on the SAME matchday (US local date), then set this one.
    const targetKey = matchdayKey(match);
    const active = await prisma.prediction.findMany({
      where: { membershipId: membership.id, powerPick: true },
      include: { match: { select: { kickoff: true } } },
    });
    const sameDayIds = active.filter((p) => matchdayKey(p.match) === targetKey).map((p) => p.id);
    if (sameDayIds.length) {
      await prisma.prediction.updateMany({ where: { id: { in: sameDayIds } }, data: { powerPick: false } });
    }
    await prisma.prediction.update({ where: { id: prediction.id }, data: { powerPick: true } });
  }

  revalidatePath(`/leagues/${leagueId}/predictions`);
  return { success: true };
}

/** Save the Tournament Winner pick. */
export async function saveWinnerPick(formData: FormData) {
  const leagueId = formData.get("leagueId") as string;
  const nationalTeamId = formData.get("nationalTeamId") as string;
  const membership = await memberOrThrow(leagueId);

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  // Once the knockout stage is locked (first KO match started), picks are final.
  if (league?.knockoutLocked) {
    return { error: "The knockout stage is locked — picks can no longer be changed." };
  }

  const existing = await prisma.tournamentWinnerPick.findUnique({
    where: { membershipId: membership.id },
  });

  // Replacement rule: only allow a change if current pick eliminated and not yet replaced
  if (existing) {
    const currentTeam = await prisma.nationalTeam.findUnique({
      where: { id: existing.nationalTeamId },
    });
    if (league?.groupLocked) {
      if (membership.winnerReplaced) {
        return { error: "You have already used your one winner replacement." };
      }
      if (!currentTeam?.eliminated) {
        return { error: "You can only replace your winner pick once it has been eliminated." };
      }
      await prisma.tournamentWinnerPick.update({
        where: { membershipId: membership.id },
        data: { nationalTeamId, isReplacement: true },
      });
      await prisma.membership.update({
        where: { id: membership.id },
        data: { winnerReplaced: true },
      });
      revalidatePath(`/leagues/${leagueId}/predictions`);
      return { success: true };
    }
  }

  await prisma.tournamentWinnerPick.upsert({
    where: { membershipId: membership.id },
    create: { membershipId: membership.id, nationalTeamId },
    update: { nationalTeamId },
  });
  revalidatePath(`/leagues/${leagueId}/predictions`);
  return { success: true };
}

/** Save the Top Scorer pick. */
export async function saveTopScorerPick(formData: FormData) {
  const leagueId = formData.get("leagueId") as string;
  const playerId = formData.get("playerId") as string;
  const membership = await memberOrThrow(leagueId);

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (league?.knockoutLocked) {
    return { error: "The knockout stage is locked — picks can no longer be changed." };
  }

  const existing = await prisma.topScorerPick.findUnique({
    where: { membershipId: membership.id },
  });

  if (existing) {
    const currentPlayer = await prisma.player.findUnique({
      where: { id: existing.playerId },
      include: { nationalTeam: true },
    });
    if (league?.groupLocked) {
      if (membership.topScorerReplaced) {
        return { error: "You have already used your one top scorer replacement." };
      }
      if (!currentPlayer?.nationalTeam.eliminated) {
        return { error: "You can only replace your top scorer once his team is eliminated." };
      }
      await prisma.topScorerPick.update({
        where: { membershipId: membership.id },
        data: { playerId, isReplacement: true },
      });
      await prisma.membership.update({
        where: { id: membership.id },
        data: { topScorerReplaced: true },
      });
      revalidatePath(`/leagues/${leagueId}/predictions`);
      return { success: true };
    }
  }

  await prisma.topScorerPick.upsert({
    where: { membershipId: membership.id },
    create: { membershipId: membership.id, playerId },
    update: { playerId },
  });
  revalidatePath(`/leagues/${leagueId}/predictions`);
  return { success: true };
}
