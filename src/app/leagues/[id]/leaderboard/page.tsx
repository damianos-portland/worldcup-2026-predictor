import { Trophy, Crown, Footprints } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { Card, CardContent } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { SharePodium } from "@/components/share-podium";
import { classNamesForMovement } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ params }: { params: { id: string } }) {
  const { league, membership } = await getMembershipOrRedirect(params.id);

  const rows = await prisma.membership.findMany({
    where: { leagueId: league.id },
    orderBy: [{ totalPoints: "desc" }, { joinedAt: "asc" }],
    include: {
      user: true,
      winnerPick: { include: { nationalTeam: true } },
      topScorerPick: { include: { player: true } },
      predictions: { where: { scored: true } },
      _count: { select: { matchdayAwards: true } },
    },
  });

  const enriched = rows.map((r) => {
    const exact = r.predictions.filter((p) => p.isExact).length;
    const outcome = r.predictions.filter((p) => p.isOutcome).length;
    return { ...r, exact, outcome };
  });

  const podium = enriched.slice(0, 3);
  const podiumOrder = [podium[1], podium[0], podium[2]]; // 2nd, 1st, 3rd

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Standings</h1>
        <SharePodium leagueId={league.id} />
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="grid grid-cols-3 items-end gap-3 sm:gap-6">
          {podiumOrder.map((p, idx) => {
            if (!p) return <div key={idx} />;
            const place = p.id === podium[0]?.id ? 1 : p.id === podium[1]?.id ? 2 : 3;
            const heights = { 1: "h-40 sm:h-48", 2: "h-32 sm:h-40", 3: "h-28 sm:h-36" };
            const colors = {
              1: "from-gold-300/30 to-gold-500/10 border-gold/50",
              2: "from-slate-300/20 to-slate-500/5 border-slate-400/30",
              3: "from-amber-700/20 to-amber-900/5 border-amber-600/30",
            };
            return (
              <div key={p.id} className="flex flex-col items-center">
                <div className={cn("mb-3 flex flex-col items-center", place === 1 && "animate-glow-pulse rounded-full")}>
                  <div className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full border-2 text-2xl font-bold",
                    place === 1 ? "btn-gold border-gold" : "glass border-white/20"
                  )}>
                    {place === 1 ? <Crown className="h-7 w-7" /> : place}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="font-display font-bold">{p.teamName}</div>
                    <div className="text-xs text-muted-foreground">{p.user.name}</div>
                  </div>
                </div>
                <div className={cn(
                  "flex w-full flex-col items-center justify-end rounded-t-2xl border bg-gradient-to-b pb-3 pt-4",
                  heights[place as 1 | 2 | 3],
                  colors[place as 1 | 2 | 3]
                )}>
                  <div className="font-display text-3xl font-bold gold-text">{p.totalPoints}</div>
                  <div className="text-xs text-muted-foreground">points</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-white/5 p-5">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">
              <Trophy className="h-5 w-5 text-gold" /> Full Standings
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Team / Manager</th>
                  <th className="px-3 py-3 text-center">Pts</th>
                  <th className="px-3 py-3 text-center">Exact</th>
                  <th className="px-3 py-3 text-center">Outcome</th>
                  <th className="px-3 py-3 text-center" title="Manager of the Matchday wins">👑</th>
                  <th className="px-3 py-3">Winner</th>
                  <th className="px-3 py-3">Top Scorer</th>
                  <th className="px-3 py-3 text-center">Move</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((r, i) => {
                  const mv = classNamesForMovement(r.currentRank, r.previousRank);
                  const mine = r.id === membership.id;
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-white/5 transition-colors hover:bg-white/[0.02]",
                        mine && "bg-gold/5"
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold",
                          i < 3 ? "btn-gold" : "bg-white/5 text-muted-foreground"
                        )}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{r.teamName}{mine && <span className="text-gold"> · You</span>}</div>
                        <div className="text-xs text-muted-foreground">{r.user.name}</div>
                      </td>
                      <td className="px-3 py-3 text-center font-display font-bold text-gold">{r.totalPoints}</td>
                      <td className="px-3 py-3 text-center">{r.exact}</td>
                      <td className="px-3 py-3 text-center">{r.outcome}</td>
                      <td className="px-3 py-3 text-center font-semibold text-gold">{r._count.matchdayAwards || "–"}</td>
                      <td className="px-3 py-3">
                        {r.winnerPick ? (
                          <Flag code={r.winnerPick.nationalTeam.code} name={r.winnerPick.nationalTeam.name} className="text-xs" />
                        ) : (
                          <span className="text-xs text-muted-foreground">–</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {r.topScorerPick ? (
                          <span className="flex items-center gap-1"><Footprints className="h-3 w-3 text-gold" />{r.topScorerPick.player.name}</span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center"><span className={mv.color}>{mv.icon}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
