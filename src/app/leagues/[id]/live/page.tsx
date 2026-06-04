import { Radio, Goal, Square, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { getLiveMatches, computeLiveStandings } from "@/lib/live";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/flag";
import { LiveRefresher } from "@/components/live-refresher";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LiveCenterPage({ params }: { params: { id: string } }) {
  const { membership } = await getMembershipOrRedirect(params.id);
  const [liveMatches, standings] = await Promise.all([
    getLiveMatches(),
    computeLiveStandings(params.id),
  ]);

  const me = standings.find((r) => r.membershipId === membership.id);
  const rankDelta = me ? me.currentRank - me.projectedRank : 0; // +ve = climbing

  return (
    <div className="space-y-6">
      <LiveRefresher />

      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-display text-xl font-bold">
          <Radio className="h-5 w-5 text-red-400" /> Live Center
        </h1>
        {liveMatches.length > 0 && (
          <Badge variant="live"><Radio className="h-3 w-3" /> {liveMatches.length} live</Badge>
        )}
      </div>

      {/* My live points */}
      {me && (
        <Card className="glass-strong">
          <CardContent className="grid grid-cols-3 gap-3 p-5 text-center">
            <div>
              <div className="font-display text-3xl font-bold gold-text">{me.liveTotal}</div>
              <div className="text-xs text-muted-foreground">Live points</div>
            </div>
            <div>
              <div className={cn("font-display text-3xl font-bold", me.provisional > 0 ? "text-emerald-400" : "text-muted-foreground")}>
                {me.provisional > 0 ? `+${me.provisional}` : "0"}
              </div>
              <div className="text-xs text-muted-foreground">In play</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 font-display text-3xl font-bold">
                #{me.projectedRank}
                {rankDelta > 0 ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : rankDelta < 0 ? <TrendingDown className="h-5 w-5 text-red-400" /> : <Minus className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="text-xs text-muted-foreground">Projected rank</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live matches */}
      {liveMatches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Radio className="h-8 w-8 text-muted-foreground" />
            <h3 className="font-display text-lg font-semibold">No live matches right now</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              When a match kicks off, the score, goals and your live points will appear here in real time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {liveMatches.map((m) => (
            <Card key={m.id} className="border-red-500/20">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <Badge variant="live"><Radio className="h-3 w-3" /> LIVE {m.minute}</Badge>
                  {m.isGolden && <Badge variant="gold">Golden ×2</Badge>}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="flex items-center justify-end gap-2 text-right font-semibold">
                    {m.homeTeam?.name ?? m.slot}
                    <Flag code={m.homeTeam?.code} showName={false} />
                  </div>
                  <div className="font-display text-3xl font-bold gold-text">
                    {m.liveHomeScore ?? 0} - {m.liveAwayScore ?? 0}
                  </div>
                  <div className="flex items-center gap-2 font-semibold">
                    <Flag code={m.awayTeam?.code} showName={false} />
                    {m.awayTeam?.name ?? "TBD"}
                  </div>
                </div>

                {/* Event ticker */}
                {m.events.length > 0 && (
                  <div className="mt-4 space-y-1.5 border-t border-white/5 pt-3">
                    {m.events.map((e) => (
                      <div key={e.id} className={cn("flex items-center gap-2 text-xs", e.side === "AWAY" && "flex-row-reverse text-right")}>
                        <span className="text-muted-foreground">{e.minute}</span>
                        {e.type.includes("GOAL") || e.type === "PENALTY" ? (
                          <Goal className="h-3.5 w-3.5 text-gold" />
                        ) : (
                          <Square className={cn("h-3 w-3", e.type === "RED_CARD" ? "fill-red-500 text-red-500" : "fill-yellow-400 text-yellow-400")} />
                        )}
                        <span className="font-medium">{e.player ?? (e.type.includes("GOAL") ? "Goal" : "Card")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Projected leaderboard */}
      {liveMatches.length > 0 && standings.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" /> Projected Standings
            </h3>
            <div className="space-y-2">
              {standings.slice(0, 10).map((r) => (
                <div
                  key={r.membershipId}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-2.5",
                    r.membershipId === membership.id ? "border-gold/40 bg-gold/5" : "border-white/5 bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-sm font-bold">{r.projectedRank}</span>
                    <div>
                      <div className="text-sm font-semibold">{r.teamName}</div>
                      <div className="text-xs text-muted-foreground">{r.managerName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-bold text-gold">{r.liveTotal}</span>
                    {r.provisional > 0 && <span className="ml-1 text-xs text-emerald-400">+{r.provisional}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
