import { Network, Table2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { computeGroupStandings } from "@/lib/standings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/flag";
import { flagEmoji } from "@/lib/flags";
import { ROUND_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ORDER = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"];

export default async function BracketPage({ params }: { params: { id: string } }) {
  await getMembershipOrRedirect(params.id);

  const [matches, standings] = await Promise.all([
    prisma.match.findMany({
      where: { phase: "KNOCKOUT", round: { in: ORDER as any } },
      orderBy: { kickoff: "asc" },
      include: { homeTeam: true, awayTeam: true },
    }),
    computeGroupStandings(),
  ]);

  const byRound = new Map<string, typeof matches>();
  for (const m of matches) {
    if (!byRound.has(m.round)) byRound.set(m.round, []);
    byRound.get(m.round)!.push(m);
  }

  return (
    <div className="space-y-6">
      {/* Group standings */}
      <div>
        <h1 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
          <Table2 className="h-5 w-5 text-gold" /> Group Standings
        </h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...standings.entries()].map(([group, rows]) => (
            <Card key={group}>
              <CardContent className="p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold/80">
                  Group {group}
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-1 text-left font-medium">#</th>
                      <th className="py-1 text-left font-medium">Team</th>
                      <th className="py-1 text-center font-medium">P</th>
                      <th className="py-1 text-center font-medium">GD</th>
                      <th className="py-1 text-center font-medium">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={r.teamId}
                        className={cn(
                          "border-t border-white/5",
                          i < 2 && "text-foreground",
                          i >= 2 && "text-muted-foreground"
                        )}
                      >
                        <td className="py-1.5">
                          <span className={cn(
                            "inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold",
                            i === 0 ? "bg-gold/20 text-gold" : i === 1 ? "bg-white/10" : ""
                          )}>{i + 1}</span>
                        </td>
                        <td className="py-1.5">{flagEmoji(r.code)} {r.name}</td>
                        <td className="py-1.5 text-center">{r.played}</td>
                        <td className="py-1.5 text-center">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                        <td className="py-1.5 text-center font-bold text-gold">{r.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Top 2 of each group (highlighted) advance directly, plus the 8 best third-placed teams.
        </p>
      </div>

      <h1 className="flex items-center gap-2 font-display text-xl font-bold">
        <Network className="h-5 w-5 text-gold" /> Tournament Bracket
      </h1>

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-6">
          {ORDER.map((round) => {
            const rms = byRound.get(round) ?? [];
            return (
              <div key={round} className="flex w-64 flex-col justify-around gap-3">
                <h3 className="section-title text-center">{ROUND_LABELS[round]}</h3>
                {rms.length === 0 ? (
                  <Card><CardContent className="p-4 text-center text-xs text-muted-foreground">Awaiting teams</CardContent></Card>
                ) : (
                  rms.map((m) => {
                    const homeWin = m.status === "FINISHED" && (m.homeScore ?? 0) > (m.awayScore ?? 0);
                    const awayWin = m.status === "FINISHED" && (m.awayScore ?? 0) > (m.homeScore ?? 0);
                    return (
                      <Card key={m.id} className="card-hover">
                        <CardContent className="space-y-1.5 p-3">
                          <div className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${homeWin ? "bg-gold/10" : ""}`}>
                            {m.homeTeam ? (
                              <Flag code={m.homeTeam.code} name={m.homeTeam.name} className="text-sm" />
                            ) : (
                              <span className="text-xs text-muted-foreground">{m.slot ?? "TBD"}</span>
                            )}
                            <span className="font-mono text-sm font-bold">{m.homeScore ?? ""}</span>
                          </div>
                          <div className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${awayWin ? "bg-gold/10" : ""}`}>
                            {m.awayTeam ? (
                              <Flag code={m.awayTeam.code} name={m.awayTeam.name} className="text-sm" />
                            ) : (
                              <span className="text-xs text-muted-foreground">TBD</span>
                            )}
                            <span className="font-mono text-sm font-bold">{m.awayScore ?? ""}</span>
                          </div>
                          {m.isGolden && <Badge variant="gold" className="w-full justify-center">Golden Match</Badge>}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
