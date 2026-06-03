"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const joinSchema = z.object({
  code: z.string().min(1, "Enter a league code"),
  displayName: z.string().min(2, "Enter your display name"),
  teamName: z.string().min(2, "Enter a team name"),
});

export async function joinLeague(_prev: unknown, formData: FormData) {
  const user = await requireUser();

  const parsed = joinSchema.safeParse({
    code: (formData.get("code") as string)?.toUpperCase().trim(),
    displayName: formData.get("displayName"),
    teamName: formData.get("teamName"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const league = await prisma.league.findUnique({
    where: { code: parsed.data.code },
  });
  if (!league) return { error: "No league found with that code." };

  const existing = await prisma.membership.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId: league.id } },
  });
  if (existing) {
    return { success: true, leagueId: league.id, alreadyMember: true };
  }

  const nameTaken = await prisma.membership.findFirst({
    where: { leagueId: league.id, teamName: parsed.data.teamName.trim() },
  });
  if (nameTaken) return { error: "That team name is already taken in this league." };

  // Update display name on the user record
  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.displayName.trim() },
  });

  await prisma.membership.create({
    data: {
      userId: user.id,
      leagueId: league.id,
      teamName: parsed.data.teamName.trim(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "GENERIC",
      title: "Welcome to the league!",
      message: `You joined ${league.name} as "${parsed.data.teamName.trim()}".`,
    },
  });

  revalidatePath("/leagues");
  return { success: true, leagueId: league.id };
}
