import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { Card, CardContent } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { opponent?: string };
}) {
  const { league, membership } = await getMembershipOrRedirect(params.id);

  const others = await prisma.membership.findMany({
    where: { leagueId: league.id, id: { not: membership.id } },
    include: { user: true },
    orderBy: { totalPoints: "desc" },
  });

  const opponentId = searchParams.opponent ?? others[0]?.id;
  const opponent = others.find((o) => o.id === opponentId);

  let comparison: any[] = [];
  let agreements = 0;
  if (opponent) {
    const matches = await prisma.match.findMany({
      orderBy: { kickoff: "asc" },
      include: { homeTeam: true, awayTeam: true },
      where: { homeTeamId: { not: null } },
    });
    const mine = new Map(
      (await prisma.prediction.findMany({ where: { membershipId: membership.id } })).map((p) => [p.matchId, p])
    );
    const theirs = new Map(
      (await prisma.prediction.findMany({ where: { membershipId: opponent.id } })).map((p) => [p.matchId, p])
    );
    comparison = matches
      .filter((m) => mine.has(m.id) || theirs.has(m.id))
      .map((m) => {
        const a = mine.get(m.id);
        const b = theirs.get(m.id);
        const same = a && b && a.homeScore === b.homeScore && a.awayScore === b.awayScore;
        if (same) agreements += 1;
        return { match: m, a, b, same };
      });
  }

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardContent className="p-5">
          <h1 className="flex items-center gap-2 font-display text-xl font-bold">
            <GitCompareArrows className="h-5 w-5 text-gold" /> Compare Predictions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Head-to-head against another manager.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((o) => (
              <Link
                key={o.id}
                href={`/leagues/${params.id}/compare?opponent=${o.id}`}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
                  o.id === opponentId ? "border-gold/50 bg-gold/15 text-gold" : "border-white/10 text-muted-foreground hover:text-foreground"
                )}
              >
                {o.teamName}
              </Link>
            ))}
            {others.length === 0 && <p className="text-sm text-muted-foreground">No other managers to compare with yet.</p>}
          </div>
        </CardContent>
      </Card>

      {opponent && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground">You</div>
              <div className="font-display text-xl font-bold">{membership.teamName}</div>
              <div className="text-gold font-bold">{membership.totalPoints} pts</div>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground">Agreements</div>
              <div className="font-display text-3xl font-bold gold-text">{agreements}</div>
              <div className="text-xs text-muted-foreground">identical scorelines</div>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground">Opponent</div>
              <div className="font-display text-xl font-bold">{opponent.teamName}</div>
              <div className="text-gold font-bold">{opponent.totalPoints} pts</div>
            </CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 text-left">Match</th>
                      <th className="px-3 py-3 text-center">You</th>
                      <th className="px-3 py-3 text-center">Result</th>
                      <th className="px-3 py-3 text-center">{opponent.teamName}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map(({ match, a, b, same }) => (
                      <tr key={match.id} className={cn("border-b border-white/5", same && "bg-gold/[0.04]")}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-xs">
                            <Flag code={match.homeTeam?.code} name={match.homeTeam?.name} showName={false} />
                            <span className="truncate">{match.homeTeam?.name} v {match.awayTeam?.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold">{a ? `${a.homeScore}-${a.awayScore}` : "–"}</td>
                        <td className="px-3 py-3 text-center font-mono text-gold">
                          {match.status === "FINISHED" ? `${match.homeScore}-${match.awayScore}` : "·"}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold">{b ? `${b.homeScore}-${b.awayScore}` : "–"}</td>
                      </tr>
                    ))}
                    {comparison.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No overlapping predictions yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
