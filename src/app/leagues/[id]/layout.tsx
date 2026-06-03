import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { LeagueNav } from "@/components/league-nav";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { ROUND_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const { league, membership } = await getMembershipOrRedirect(params.id);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container py-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold">{league.name}</h1>
              <Badge variant="secondary" className="font-mono">{league.code}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Playing as <span className="font-semibold text-foreground">{membership.teamName}</span> ·
              Rank #{membership.currentRank || "–"} · {membership.totalPoints} pts
            </p>
          </div>
          <Badge variant="gold" className="px-3 py-1.5">
            {ROUND_LABELS[league.phase] ?? league.phase}
          </Badge>
        </div>

        <LeagueNav leagueId={params.id} />
        {children}
      </div>
    </div>
  );
}
