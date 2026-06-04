import { Target, Crosshair, Crown, Footprints, Sparkles, Flame, Trophy, Percent, Brain } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { membershipStats } from "@/lib/scoring";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const { user, membership } = await getMembershipOrRedirect(params.id);
  const stats = await membershipStats(membership.id);
  const full = await prisma.membership.findUnique({
    where: { id: membership.id },
    include: {
      winnerPick: { include: { nationalTeam: true } },
      topScorerPick: { include: { player: true } },
    },
  });

  if (!stats) return null;

  const counters = [
    { label: "Exact Scores Correct", value: stats.exactCorrect, icon: Target },
    { label: "Correct Outcomes", value: stats.outcomeCorrect, icon: Crosshair },
    { label: "Prediction Accuracy", value: `${stats.accuracy}%`, icon: Percent },
    { label: "Predictions Made", value: stats.predictionsMade, icon: Sparkles },
  ];

  const breakdown = [
    { label: "Points from Exact Scores", value: stats.pointsFromExact, icon: Target },
    { label: "Points from Outcomes", value: stats.pointsFromOutcomes, icon: Crosshair },
    { label: "Winner Bonus", value: stats.pointsFromWinner, icon: Crown },
    { label: "Top Scorer Bonus", value: stats.pointsFromTopScorer, icon: Footprints },
    { label: "Joker Bonus", value: stats.pointsFromJoker, icon: Sparkles },
    { label: "Streak Bonus", value: stats.pointsFromStreaks, icon: Flame },
    { label: "Quiz Points", value: stats.pointsFromQuiz, icon: Brain },
  ];

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl btn-gold font-display text-2xl font-bold">
              {membership.teamName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">{membership.teamName}</h1>
              <p className="text-sm text-muted-foreground">{user.name} · Rank #{membership.currentRank || "–"}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="font-display text-4xl font-bold gold-text">{stats.totalPoints}</div>
            <div className="text-xs text-muted-foreground">Total Points</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counters.map((c) => (
          <Card key={c.label} className="card-hover">
            <CardContent className="p-4">
              <c.icon className="h-5 w-5 text-gold" />
              <div className="mt-2 font-display text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="section-title mb-4 flex items-center gap-2"><Trophy className="h-3.5 w-3.5" /> Points Breakdown</h3>
          <div className="space-y-2">
            {breakdown.map((b) => (
              <div key={b.label} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <b.icon className="h-4 w-4 text-gold" /> {b.label}
                </span>
                <span className="font-display font-bold text-gold">{b.value} pts</span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
              <span className="font-semibold">Total</span>
              <span className="font-display text-lg font-bold text-gold">{stats.totalPoints} pts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground"><Crown className="h-4 w-4 text-gold" /> Champion Pick</span>
            <span className="text-sm font-semibold">{full?.winnerPick?.nationalTeam.name ?? "Not set"}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground"><Footprints className="h-4 w-4 text-gold" /> Top Scorer Pick</span>
            <span className="text-sm font-semibold">{full?.topScorerPick?.player.name ?? "Not set"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
