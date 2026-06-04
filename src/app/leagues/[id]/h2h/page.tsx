import { Swords, Trophy } from "lucide-react";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { computeH2H } from "@/lib/h2h";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function H2HPage({ params }: { params: { id: string } }) {
  const { membership } = await getMembershipOrRedirect(params.id);
  const { rows, fixtures } = await computeH2H(params.id);

  const myTeam = membership.teamName;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold">
          <Swords className="h-5 w-5 text-gold" /> Head-to-Head
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A second competition: each matchday you're paired 1v1, and whoever scores more
          prediction points wins (3 / 1 / 0). Runs alongside the main points table.
        </p>
      </div>

      {rows.length < 2 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 py-14 text-center">
          <Swords className="h-8 w-8 text-muted-foreground" />
          <h3 className="font-display text-lg font-semibold">H2H needs at least 2 managers</h3>
          <p className="max-w-sm text-sm text-muted-foreground">Invite more players, and fixtures begin once a matchday finishes.</p>
        </CardContent></Card>
      ) : (
        <>
          {/* H2H table */}
          <Card>
            <CardContent className="p-0">
              <div className="border-b border-white/5 p-5">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                  <Trophy className="h-5 w-5 text-gold" /> H2H Table
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Team / Manager</th>
                      <th className="px-3 py-3 text-center">P</th>
                      <th className="px-3 py-3 text-center">W</th>
                      <th className="px-3 py-3 text-center">D</th>
                      <th className="px-3 py-3 text-center">L</th>
                      <th className="px-3 py-3 text-center">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const mine = r.membershipId === membership.id;
                      return (
                        <tr key={r.membershipId} className={cn("border-b border-white/5", mine && "bg-gold/5")}>
                          <td className="px-4 py-3">
                            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold", i === 0 ? "btn-gold" : "bg-white/5 text-muted-foreground")}>{i + 1}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold">{r.teamName}{mine && <span className="text-gold"> · You</span>}</div>
                            <div className="text-xs text-muted-foreground">{r.managerName}</div>
                          </td>
                          <td className="px-3 py-3 text-center">{r.played}</td>
                          <td className="px-3 py-3 text-center text-emerald-400">{r.won}</td>
                          <td className="px-3 py-3 text-center text-muted-foreground">{r.drawn}</td>
                          <td className="px-3 py-3 text-center text-red-400">{r.lost}</td>
                          <td className="px-3 py-3 text-center font-display font-bold text-gold">{r.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent fixtures */}
          {fixtures.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="section-title mb-4">Matchday Fixtures</h3>
                <div className="space-y-4">
                  {fixtures.map((f) => (
                    <div key={f.matchdayKey}>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold/80">{f.label}</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {f.results.map((m, i) => (
                          <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
                            <span className={cn("flex-1 truncate", m.outcome === "HOME" && "font-semibold text-emerald-300", m.home === myTeam && "text-gold")}>{m.home}</span>
                            <span className="px-2 font-mono font-bold">{m.homePts}-{m.awayPts}</span>
                            <span className={cn("flex-1 truncate text-right", m.outcome === "AWAY" && "font-semibold text-emerald-300", m.away === myTeam && "text-gold")}>{m.away}</span>
                          </div>
                        ))}
                        {f.results.length === 0 && <div className="text-xs text-muted-foreground">No fixtures.</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
