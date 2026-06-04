import Link from "next/link";
import {
  Trophy,
  Target,
  Sparkles,
  Crown,
  Footprints,
  ListChecks,
  Bell,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { membershipStats } from "@/lib/scoring";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/flag";
import { Countdown } from "@/components/countdown";
import { classNamesForMovement, formatKickoff } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeagueOverview({ params }: { params: { id: string } }) {
  const { user, league, membership } = await getMembershipOrRedirect(params.id);

  const [stats, picks, topFive, nextMatch, recentResults, notifications, predictionCount, matchTotal, matchdayAwards] =
    await Promise.all([
      membershipStats(membership.id),
      prisma.membership.findUnique({
        where: { id: membership.id },
        include: {
          winnerPick: { include: { nationalTeam: true } },
          topScorerPick: { include: { player: { include: { nationalTeam: true } } } },
        },
      }),
      prisma.membership.findMany({
        where: { leagueId: league.id },
        orderBy: [{ totalPoints: "desc" }, { joinedAt: "asc" }],
        take: 5,
        include: { user: true },
      }),
      prisma.match.findFirst({
        where: { kickoff: { gte: new Date() }, status: "UPCOMING" },
        orderBy: { kickoff: "asc" },
        include: { homeTeam: true, awayTeam: true },
      }),
      prisma.match.findMany({
        where: { status: "FINISHED" },
        orderBy: { kickoff: "desc" },
        take: 4,
        include: { homeTeam: true, awayTeam: true },
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.prediction.count({ where: { membershipId: membership.id } }),
      prisma.match.count(),
      prisma.matchdayAward.findMany({
        where: { leagueId: league.id },
        include: { membership: { include: { user: true } } },
      }),
    ]);

  const move = classNamesForMovement(membership.currentRank, membership.previousRank);

  // Group Manager-of-the-Matchday awards by matchday (date keys sort naturally).
  const awardsByKey = new Map<string, { key: string; label: string; points: number; winners: string[] }>();
  for (const a of matchdayAwards) {
    if (!awardsByKey.has(a.matchdayKey)) {
      awardsByKey.set(a.matchdayKey, { key: a.matchdayKey, label: a.label, points: a.points, winners: [] });
    }
    awardsByKey.get(a.matchdayKey)!.winners.push(a.membership.teamName);
  }
  const orderedAwards = [...awardsByKey.values()].sort((x, y) => x.key.localeCompare(y.key));

  const statCards = [
    { label: "Total Points", value: membership.totalPoints, icon: Trophy },
    { label: "Rank", value: `#${membership.currentRank || "–"}`, icon: TrendingUp, extra: `${move.icon}`, extraColor: move.color },
    { label: "Exact Scores", value: stats?.exactCorrect ?? 0, icon: Target },
    { label: "Accuracy", value: `${stats?.accuracy ?? 0}%`, icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <s.icon className="h-5 w-5 text-gold" />
                {s.extra && <span className={`text-sm ${s.extraColor}`}>{s.extra}</span>}
              </div>
              <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Next match + CTA */}
        <Card className="glass-strong lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="section-title">Next Match</h3>
              <Link href={`/leagues/${league.id}/predictions`}>
                <Button size="sm" variant="outline">
                  <ListChecks className="h-4 w-4" /> Make Predictions
                </Button>
              </Link>
            </div>
            {nextMatch ? (
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
                <div className="flex items-center gap-4 font-display text-lg font-bold">
                  {nextMatch.homeTeam ? (
                    <>
                      <Flag code={nextMatch.homeTeam.code} name={nextMatch.homeTeam.name} />
                      <span className="text-muted-foreground">vs</span>
                      <Flag code={nextMatch.awayTeam?.code} name={nextMatch.awayTeam?.name} reverse />
                    </>
                  ) : (
                    <span>{nextMatch.slot}</span>
                  )}
                  {nextMatch.isGolden && <Badge variant="gold"><Sparkles className="h-3 w-3" /> Golden</Badge>}
                </div>
                <Countdown target={nextMatch.kickoff.toISOString()} />
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No upcoming matches.</p>
            )}
            {nextMatch && (
              <p className="mt-4 text-center text-xs text-muted-foreground sm:text-right">
                {formatKickoff(nextMatch.kickoff)} · {nextMatch.venue}
              </p>
            )}
          </CardContent>
        </Card>

        {/* My picks */}
        <Card>
          <CardContent className="p-5">
            <h3 className="section-title mb-4">My Tournament Picks</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Crown className="h-4 w-4 text-gold" /> Winner
                </span>
                {picks?.winnerPick ? (
                  <Flag code={picks.winnerPick.nationalTeam.code} name={picks.winnerPick.nationalTeam.name} />
                ) : (
                  <span className="text-sm text-muted-foreground">Not set</span>
                )}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Footprints className="h-4 w-4 text-gold" /> Top Scorer
                </span>
                {picks?.topScorerPick ? (
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {picks.topScorerPick.player.name}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Not set</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                  <div className="text-xs text-muted-foreground">Group Joker</div>
                  <Badge variant={membership.groupJokerUsed ? "secondary" : "success"} className="mt-1">
                    {membership.groupJokerUsed ? "Used" : "Available"}
                  </Badge>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                  <div className="text-xs text-muted-foreground">KO Joker</div>
                  <Badge variant={membership.knockoutJokerUsed ? "secondary" : "success"} className="mt-1">
                    {membership.knockoutJokerUsed ? "Used" : "Available"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mini leaderboard */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="section-title flex items-center gap-2"><Trophy className="h-3.5 w-3.5" /> Standings</h3>
              <Link href={`/leagues/${league.id}/leaderboard`} className="text-xs text-gold hover:underline">
                View full →
              </Link>
            </div>
            <div className="space-y-2">
              {topFive.map((t, i) => {
                const mv = classNamesForMovement(t.currentRank, t.previousRank);
                const mine = t.id === membership.id;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${
                      mine ? "border-gold/40 bg-gold/5" : "border-white/5 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${i === 0 ? "btn-gold" : "bg-white/5 text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-sm font-semibold">{t.teamName}{mine && " (You)"}</div>
                        <div className="text-xs text-muted-foreground">{t.user.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${mv.color}`}>{mv.icon}</span>
                      <span className="font-display font-bold text-gold">{t.totalPoints}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardContent className="p-5">
            <h3 className="section-title mb-4 flex items-center gap-2"><Bell className="h-3.5 w-3.5" /> Notifications</h3>
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="text-sm font-semibold">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.message}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent results + progress */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="section-title">Recent Results</h3>
            <span className="text-xs text-muted-foreground">
              {predictionCount} predictions submitted · {matchTotal} matches
            </span>
          </div>
          {recentResults.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No results entered yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recentResults.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                  <Flag code={m.homeTeam?.code} name={m.homeTeam?.name} />
                  <span className="font-display text-lg font-bold text-gold">
                    {m.homeScore} - {m.awayScore}
                  </span>
                  <Flag code={m.awayTeam?.code} name={m.awayTeam?.name} reverse />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manager of the Matchday roll of honour */}
      {matchdayAwards.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <Crown className="h-3.5 w-3.5" /> Manager of the Matchday
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {orderedAwards.map((a) => (
                <div key={a.key} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5">
                  <div>
                    <div className="text-xs text-muted-foreground">{a.label}</div>
                    <div className="text-sm font-semibold">{a.winners.join(", ")}</div>
                  </div>
                  <Badge variant="gold">{a.points} pts</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
