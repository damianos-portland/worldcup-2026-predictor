import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/** Ensures the current user is a member of the league; returns membership + league. */
export async function getMembershipOrRedirect(leagueId: string) {
  const user = await requireUser();
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) notFound();

  const membership = await prisma.membership.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId } },
  });
  if (!membership) redirect("/leagues");

  return { user, league, membership };
}
