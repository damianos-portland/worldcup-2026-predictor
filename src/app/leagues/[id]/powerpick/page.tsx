import { Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { matchdayKey, matchdayLabel } from "@/lib/matchday";
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

  // Group by matchday (calendar day); show matchdays that still have an upcoming match.
  const byKey = new Map<string, typeof matches>();
  for (const m of matches) {
    const key = matchdayKey(m);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(m);
  }

  const matchdays: PPMatchday[] = [...byKey.entries()]
    .filter(([, ms]) => ms.some((m) => m.status === "UPCOMING" && m.kickoff > now))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ms]) => ({
      key,
      label: matchdayLabel(key),
      matches: ms
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
    .filter((md) => md.matches.length > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold">
          <Star className="h-5 w-5 text-gold" /> Power Pick
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each matchday (a calendar day), boost <span className="text-gold">one</span> match by ×1.5.
          You can only Power Pick a match you've predicted — make your predictions first, then choose your boost here.
        </p>
      </div>
      <PowerPickSelector leagueId={params.id} matchdays={matchdays} />
    </div>
  );
}
