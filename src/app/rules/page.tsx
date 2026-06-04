import Link from "next/link";
import {
  Target, Crosshair, Sparkles, Star, Flame, Crown, Footprints, Brain,
  Swords, Trophy, Lock, ArrowRight, BookOpen, Zap, ShieldAlert,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { AchievementIcon } from "@/components/achievement-icon";

export const metadata = { title: "Game Rules · World Cup 2026 Predictor League" };

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 text-gold"><Icon className="h-5 w-5" /></span>
          {title}
        </h2>
        {children}
      </CardContent>
    </Card>
  );
}

function Row({ left, right, sub }: { left: React.ReactNode; right: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <div>
        <div className="text-sm font-medium">{left}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
      <div className="font-display font-bold text-gold">{right}</div>
    </div>
  );
}

export default function RulesPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container max-w-4xl py-10">
        {/* Hero */}
        <div className="mb-8 text-center">
          <Badge variant="gold" className="mx-auto mb-4"><BookOpen className="h-3.5 w-3.5" /> Game Rules</Badge>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">How to Play</h1>
          <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
            Predict every match, use your power-ups wisely, and climb the rankings. Here's exactly how points work.
          </p>
        </div>

        <div className="space-y-5">
          {/* Core scoring */}
          <Section icon={Target} title="Match Scoring">
            <div className="grid gap-2 sm:grid-cols-3">
              <Row left="Exact score" right="10 pts" sub="e.g. you said 2-1, it ends 2-1" />
              <Row left="Correct outcome" right="3 pts" sub="right winner/draw, wrong score" />
              <Row left="Wrong" right="0 pts" sub="missed the result" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Predict the scoreline of every group-stage and knockout match before kickoff. Predictions lock when the match starts.
            </p>
          </Section>

          {/* Multipliers */}
          <Section icon={Zap} title="Power-Ups (multipliers)">
            <div className="grid gap-2 sm:grid-cols-3">
              <Row left={<span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-gold" /> Golden Match</span>} right="×2" sub="One per group & per KO round, set by admin" />
              <Row left={<span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-gold" /> Joker</span>} right="×2" sub="One in the group stage, one in the knockouts" />
              <Row left={<span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-gold" /> Power Pick</span>} right="×1.5" sub="One every matchday (a calendar day)" />
            </div>
            <div className="mt-3 rounded-xl border border-gold/20 bg-gold/[0.04] p-3 text-sm">
              <span className="font-semibold text-gold">They stack.</span> Land an exact score on a Golden Match with your Joker <em>and</em> Power Pick:
              <span className="ml-1 font-mono">10 × 2 × 2 × 1.5 = <span className="text-gold font-bold">60 pts</span></span> 🔥
            </div>
          </Section>

          {/* Streaks */}
          <Section icon={Flame} title="Streak Bonuses">
            <div className="grid gap-2 sm:grid-cols-2">
              <Row left="3 exact scores in a row" right="+5 pts" />
              <Row left="5 exact scores in a row" right="+15 pts" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Counted in chronological order across all your scored matches.</p>
          </Section>

          {/* Tournament bonuses */}
          <Section icon={Crown} title="Tournament Bonuses">
            <div className="grid gap-2 sm:grid-cols-2">
              <Row left={<span className="flex items-center gap-1.5"><Crown className="h-4 w-4 text-gold" /> Tournament Winner</span>} right="+30 pts" sub="if your pick lifts the trophy" />
              <Row left={<span className="flex items-center gap-1.5"><Footprints className="h-4 w-4 text-gold" /> Top Scorer</span>} right="+25 pts" sub="if your pick wins the Golden Boot" />
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>
                <span className="font-semibold">One replacement allowed.</span> If your Winner or Top Scorer is eliminated, you may swap once (before the knockouts begin) — but a replacement scores <span className="text-gold">half</span> the bonus (+15 / +13).
              </span>
            </div>
          </Section>

          {/* Quiz */}
          <Section icon={Brain} title="Matchday Quiz">
            <p className="mb-3 text-sm text-muted-foreground">A short quiz of ~10 questions drops each matchday. Answer correctly for bonus points:</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[["0–5", "0"], ["6", "1"], ["7", "2"], ["8", "3"], ["9", "4"], ["10", "5"]].map(([c, p]) => (
                <div key={c} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                  <div className="text-xs text-muted-foreground">{c} correct</div>
                  <div className="font-display text-lg font-bold text-gold">{p}{p === "5" ? "★" : ""}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">A perfect 10/10 also earns the <span className="text-gold">Quiz Genius</span> badge.</p>
          </Section>

          {/* Recognition: MotM + H2H */}
          <div className="grid gap-5 md:grid-cols-2">
            <Section icon={Trophy} title="Manager of the Matchday">
              <p className="text-sm text-muted-foreground">
                Each matchday (a calendar day of games), whoever scores the most prediction points is crowned <span className="font-semibold text-foreground">Manager of the Matchday</span> — a badge, a notification, and a tally on the leaderboard. Ties share the crown.
              </p>
            </Section>
            <Section icon={Swords} title="Head-to-Head">
              <p className="text-sm text-muted-foreground">
                A second competition running alongside the points table: each matchday you're paired 1v1, and whoever scores more that day wins (<span className="text-gold font-semibold">3 / 1 / 0</span>). It builds its own W-D-L league table.
              </p>
            </Section>
          </div>

          {/* Phases */}
          <Section icon={Lock} title="Phases & Flow">
            <ol className="space-y-2 text-sm">
              {[
                "Group Stage — predict all group matches + pick your Tournament Winner and Top Scorer.",
                "The admin locks the group stage; your Winner/Top Scorer picks become final.",
                "Knockouts open — predict Round of 32 through the Final. Points are cumulative.",
                "The bracket fills automatically as results come in; the champion enters the Hall of Fame.",
              ].map((t, i) => (
                <li key={i} className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg btn-gold text-xs font-bold">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </Section>

          {/* Achievements */}
          <Section icon={Star} title="Achievements">
            <div className="grid gap-2 sm:grid-cols-2">
              {ACHIEVEMENTS.map((a) => (
                <div key={a.key} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
                    <AchievementIcon name={a.icon} className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* CTA */}
          <Card className="glass-strong">
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <h3 className="font-display text-xl font-bold">Ready to climb the rankings?</h3>
              <Link href="/leagues">
                <Button size="lg" className="group">Join a League <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
