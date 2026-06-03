import Link from "next/link";
import {
  Trophy,
  Flame,
  Users,
  Target,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  CalendarClock,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { Countdown } from "@/components/countdown";
import { Flag } from "@/components/flag";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { classNamesForMovement, formatKickoff } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();

  const [nextMatch, leagues, topTeams, totalMatches, finishedMatches, teamCount] =
    await Promise.all([
      prisma.match.findFirst({
        where: { kickoff: { gte: now }, status: { not: "FINISHED" } },
        orderBy: { kickoff: "asc" },
        include: { homeTeam: true, awayTeam: true },
      }),
      prisma.league.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { _count: { select: { memberships: true } } },
      }),
      prisma.membership.findMany({
        orderBy: { totalPoints: "desc" },
        take: 5,
        include: { user: true, league: true },
      }),
      prisma.match.count(),
      prisma.match.count({ where: { status: "FINISHED" } }),
      prisma.nationalTeam.count(),
    ]);

  const progress = totalMatches ? Math.round((finishedMatches / totalMatches) * 100) : 0;

  const features = [
    { icon: Target, title: "Exact-Score Scoring", text: "10 pts for exact, 3 for the right outcome — every match counts." },
    { icon: Sparkles, title: "Jokers & Golden Matches", text: "Double your points with strategic Jokers and admin Golden Matches." },
    { icon: Flame, title: "Streak Bonuses", text: "Stack exact scores in a row for explosive bonus points." },
    { icon: Trophy, title: "Winner & Top Scorer", text: "Bonus 30 + 25 pts for nailing the champion and the Golden Boot." },
    { icon: TrendingUp, title: "Live Leaderboards", text: "Animated rankings with movement indicators and a podium." },
    { icon: ShieldCheck, title: "Private Leagues", text: "Unlimited invite-only leagues for colleagues, friends and family." },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="container py-16 sm:py-24">
          <div className="mx-auto max-w-4xl text-center animate-fade-up">
            <Badge variant="gold" className="mx-auto mb-6 px-4 py-1.5 text-sm">
              <Sparkles className="h-3.5 w-3.5" /> FIFA World Cup 2026 · Canada · Mexico · USA
            </Badge>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              WORLD CUP <span className="gold-text">2026</span>
              <br />
              PREDICTOR LEAGUE
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Predict every match. Compete with friends and colleagues. Climb the
              rankings and become the World Champion Predictor.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/leagues">
                <Button size="lg" className="group">
                  Join a League
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline">Create Account</Button>
              </Link>
            </div>
          </div>

          {/* Countdown + next match */}
          <div className="mx-auto mt-14 max-w-3xl">
            <Card className="glass-strong overflow-hidden">
              <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:justify-between">
                <div className="text-center sm:text-left">
                  <div className="section-title flex items-center justify-center gap-2 sm:justify-start">
                    <CalendarClock className="h-3.5 w-3.5" /> Countdown to next match
                  </div>
                  {nextMatch ? (
                    <div className="mt-2 font-display text-lg font-bold">
                      {nextMatch.homeTeam ? (
                        <span className="inline-flex items-center gap-4">
                          <Flag code={nextMatch.homeTeam.code} name={nextMatch.homeTeam.name} />
                          <span className="text-muted-foreground">vs</span>
                          <Flag code={nextMatch.awayTeam?.code} name={nextMatch.awayTeam?.name} reverse />
                        </span>
                      ) : (
                        <span>{nextMatch.slot ?? "Tournament kicks off soon"}</span>
                      )}
                      <div className="mt-1 text-xs font-normal text-muted-foreground">
                        {formatKickoff(nextMatch.kickoff)}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Schedule loading…</p>
                  )}
                </div>
                {nextMatch && <Countdown target={nextMatch.kickoff.toISOString()} />}
              </CardContent>
            </Card>
          </div>

          {/* Quick stats */}
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-3 gap-3">
            {[
              { label: "Nations", value: teamCount, icon: Users },
              { label: "Matches", value: totalMatches, icon: Target },
              { label: "Played", value: `${progress}%`, icon: TrendingUp },
            ].map((s) => (
              <Card key={s.label} className="card-hover">
                <CardContent className="flex items-center gap-3 p-4">
                  <s.icon className="h-5 w-5 text-gold" />
                  <div>
                    <div className="font-display text-xl font-bold">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="card-hover">
              <CardContent className="p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* WIDGETS */}
      <section className="container grid gap-6 py-10 lg:grid-cols-3">
        {/* Top teams */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="section-title flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5" /> Top Teams
              </h3>
              <span className="text-xs text-muted-foreground">Across all leagues</span>
            </div>
            {topTeams.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No teams yet — be the first to join a league.
              </p>
            ) : (
              <div className="space-y-2">
                {topTeams.map((t, i) => {
                  const move = classNamesForMovement(t.currentRank, t.previousRank);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${
                            i === 0 ? "btn-gold" : "bg-white/5 text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <div className="font-semibold">{t.teamName}</div>
                          <div className="text-xs text-muted-foreground">
                            {t.user.name} · {t.league.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm ${move.color}`}>{move.icon}</span>
                        <span className="font-display font-bold text-gold">
                          {t.totalPoints} <span className="text-xs text-muted-foreground">pts</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current leagues */}
        <Card>
          <CardContent className="p-5">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <Users className="h-3.5 w-3.5" /> Current Leagues
            </h3>
            {leagues.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No leagues yet.</p>
            ) : (
              <div className="space-y-2">
                {leagues.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                  >
                    <div>
                      <div className="font-semibold">{l.name}</div>
                      <div className="font-mono text-xs text-gold/80">{l.code}</div>
                    </div>
                    <Badge variant="secondary">{l._count.memberships} 👥</Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Link href="/leagues">
                <Button variant="outline" className="w-full">
                  Browse & Join <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tournament progress */}
      <section className="container pb-16">
        <Card className="glass-strong">
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="section-title">Tournament Progress</h3>
              <span className="text-sm font-semibold text-gold">
                {finishedMatches}/{totalMatches} matches
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-white/5 py-8">
        <div className="container text-center text-xs text-muted-foreground">
          World Cup 2026 Predictor League · Built with Next.js, Prisma & PostgreSQL ·
          100% free & self-hostable
        </div>
      </footer>
    </div>
  );
}
