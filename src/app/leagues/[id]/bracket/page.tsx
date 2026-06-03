import { Network } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/flag";
import { ROUND_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ORDER = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"];

export default async function BracketPage({ params }: { params: { id: string } }) {
  await getMembershipOrRedirect(params.id);

  const matches = await prisma.match.findMany({
    where: { phase: "KNOCKOUT", round: { in: ORDER as any } },
    orderBy: { kickoff: "asc" },
    include: { homeTeam: true, awayTeam: true },
  });

  const byRound = new Map<string, typeof matches>();
  for (const m of matches) {
    if (!byRound.has(m.round)) byRound.set(m.round, []);
    byRound.get(m.round)!.push(m);
  }

  return (
    <div className="space-y-5">
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
