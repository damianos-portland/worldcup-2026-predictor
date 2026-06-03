import Link from "next/link";
import { Ticket, Trophy, ArrowRight, Crown, Medal } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { JoinLeagueForm } from "@/components/join-league-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROUND_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeaguesPage() {
  const user = await requireUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: {
      league: { include: { _count: { select: { memberships: true } } } },
    },
    orderBy: { joinedAt: "desc" },
  });

  const hallOfFame = await prisma.hallOfFame.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Your Leagues</h1>
          <p className="mt-1 text-muted-foreground">
            Join a private league with an invite code or jump back into your competitions.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* My leagues */}
          <div className="space-y-4 lg:col-span-2">
            {memberships.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 text-gold">
                    <Trophy className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">No leagues yet</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Enter an invite code from your league admin to get started. Try the demo
                    code <span className="font-mono text-gold">DEMOL-EAGUE</span>.
                  </p>
                </CardContent>
              </Card>
            ) : (
              memberships.map((m) => (
                <Link key={m.id} href={`/leagues/${m.leagueId}`}>
                  <Card className="card-hover">
                    <CardContent className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl btn-gold font-display text-lg font-bold">
                          {m.currentRank || "–"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-semibold">{m.league.name}</h3>
                            <Badge variant="secondary" className="font-mono">{m.league.code}</Badge>
                          </div>
                          <div className="mt-0.5 text-sm text-muted-foreground">
                            {m.teamName} · {m.league._count.memberships} managers ·{" "}
                            {ROUND_LABELS[m.league.phase] ?? m.league.phase}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-display text-xl font-bold text-gold">{m.totalPoints}</div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}

            {/* Hall of fame */}
            <Card>
              <CardContent className="p-5">
                <h3 className="section-title mb-4 flex items-center gap-2">
                  <Crown className="h-3.5 w-3.5" /> Hall of Fame
                </h3>
                <div className="space-y-2">
                  {hallOfFame.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Medal className="h-5 w-5 text-gold" />
                        <div>
                          <div className="font-semibold">{h.winnerTeam}</div>
                          <div className="text-xs text-muted-foreground">
                            {h.leagueName} · {h.season} · {h.winnerName}
                          </div>
                        </div>
                      </div>
                      <Badge variant="gold">{h.winnerPoints} pts</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Join form */}
          <div>
            <Card className="glass-strong sticky top-20">
              <CardContent className="p-5">
                <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
                  <Ticket className="h-5 w-5 text-gold" /> Join a League
                </h3>
                <p className="mb-5 text-sm text-muted-foreground">
                  Enter the code your admin shared with you.
                </p>
                <JoinLeagueForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
