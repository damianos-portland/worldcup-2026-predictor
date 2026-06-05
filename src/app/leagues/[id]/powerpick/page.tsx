import { Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { computeQuizMatchdays } from "@/lib/quiz-matchday";
import { PowerPickSelector, type PPMatchday } from "@/components/power-pick-selector";

export const dynamic = "force-dynamic";

export default async function PowerPickPage({ params }: { params: { id: string } }) {
  const { membership } = await getMembershipOrRedirect(params.id);
  const now = new Date();

  const [matches, predictions] = await Promise.all([
    prisma.match.findMany({
      orderBy: { kickoff: "asc" },
      include: { homeTeam: true, awayTeam: true },
    }),
    prisma.prediction.findMany({ where: { membershipId: membership.id } }),
  ]);
  const predByMatch = new Map(predictions.map((p) => [p.matchId, p]));
  const matchById = new Map(matches.map((m) => [m.id, m]));

  // Same matchday buckets as the quizzes: chronological bunches of 4–8 matches.
  const buckets = computeQuizMatchdays(matches.map((m) => ({ id: m.id, kickoff: m.kickoff, phase: m.phase })));

  const matchdays: PPMatchday[] = buckets
    .map((b) => ({
      key: b.key,
      label: b.label,
      matches: b.matchIds
        .map((id) => matchById.get(id)!)
        .filter((m) => m.homeTeam && m.awayTeam) // predictable fixtures only
        .map((m) => {
          const pred = predByMatch.get(m.id);
          return {
            id: m.id,
            homeName: m.homeTeam?.name,
            homeCode: m.homeTeam?.code,
            awayName: m.awayTeam?.name,
            awayCode: m.awayTeam?.code,
            slot: m.slot,
            kickoff: m.kickoff.toISOString(),
            isGolden: m.isGolden,
            predicted: !!pred,
            predictionText: pred ? `${pred.homeScore}-${pred.awayScore}` : null,
            powerPick: pred?.powerPick ?? false,
            locked: m.status !== "UPCOMING" || m.kickoff <= now,
          };
        }),
    }))
    // Show buckets that still have an upcoming match (or where you've already picked).
    .filter((md) => md.matches.some((m) => !m.locked || m.powerPick));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold">
          <Star className="h-5 w-5 text-gold" /> Power Pick
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each matchday, boost <span className="text-gold">one</span> match by ×1.5. Matchdays are the
          same chronological bunches as the quizzes. You can only Power Pick a match you've predicted —
          make your predictions first, then choose your boost here.
        </p>
      </div>
      <PowerPickSelector leagueId={params.id} matchdays={matchdays} />
    </div>
  );
}
