import { ListChecks, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { MatchPredictionCard } from "@/components/predictions/match-prediction-card";
import { TournamentPicks } from "@/components/predictions/tournament-picks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROUND_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PredictionsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { phase?: string };
}) {
  const { league, membership } = await getMembershipOrRedirect(params.id);
  const phase = searchParams.phase === "KNOCKOUT" ? "KNOCKOUT" : "GROUP";

  const [matches, predictions, teams, players, picks] = await Promise.all([
    prisma.match.findMany({
      where: { phase: phase as any },
      orderBy: [{ kickoff: "asc" }],
      include: { homeTeam: true, awayTeam: true },
    }),
    prisma.prediction.findMany({ where: { membershipId: membership.id } }),
    prisma.nationalTeam.findMany({ orderBy: { name: "asc" } }),
    prisma.player.findMany({ include: { nationalTeam: true }, orderBy: { name: "asc" } }),
    prisma.membership.findUnique({
      where: { id: membership.id },
      include: { winnerPick: true, topScorerPick: true },
    }),
  ]);

  const predByMatch = new Map(predictions.map((p) => [p.matchId, p]));
  const jokerUsedThisPhase = phase === "GROUP" ? membership.groupJokerUsed : membership.knockoutJokerUsed;

  // Group matches by round (knockout) or group letter (group stage)
  const sections = new Map<string, typeof matches>();
  for (const m of matches) {
    const key = phase === "GROUP" ? `Group ${m.group}` : ROUND_LABELS[m.round] ?? m.round;
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key)!.push(m);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {/* Phase switch */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <ListChecks className="h-5 w-5 text-gold" /> Predictions
          </h2>
          <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <a
              href={`/leagues/${params.id}/predictions?phase=GROUP`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${phase === "GROUP" ? "btn-gold" : "text-muted-foreground"}`}
            >
              Group Stage
            </a>
            <a
              href={`/leagues/${params.id}/predictions?phase=KNOCKOUT`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${phase === "KNOCKOUT" ? "btn-gold" : "text-muted-foreground"}`}
            >
              Knockouts
            </a>
          </div>
        </div>

        {phase === "KNOCKOUT" && !league.knockoutOpen && (
          <Card>
            <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
              <Sparkles className="h-5 w-5 text-gold" />
              The knockout phase opens once the admin closes the group stage. Fixtures will appear here.
            </CardContent>
          </Card>
        )}

        {league.knockoutLocked && (
          <Card className="border-gold/30">
            <CardContent className="flex items-center gap-3 p-5 text-sm">
              <Sparkles className="h-5 w-5 text-gold" />
              The knockout stage is locked — predictions and Winner / Top Scorer replacements are final.
            </CardContent>
          </Card>
        )}

        {[...sections.entries()].map(([title, group]) => (
          <div key={title}>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="section-title">{title}</h3>
              <Badge variant="secondary">{group.length} matches</Badge>
            </div>
            <div className="grid gap-3">
              {group.map((m) => (
                <MatchPredictionCard
                  key={m.id}
                  leagueId={params.id}
                  jokerAvailable={!jokerUsedThisPhase}
                  match={{
                    id: m.id,
                    status: m.status,
                    isGolden: m.isGolden,
                    kickoff: m.kickoff.toISOString(),
                    homeName: m.homeTeam?.name,
                    homeCode: m.homeTeam?.code,
                    awayName: m.awayTeam?.name,
                    awayCode: m.awayTeam?.code,
                    homeScore: m.homeScore,
                    awayScore: m.awayScore,
                    slot: m.slot,
                  }}
                  prediction={predByMatch.get(m.id) ?? null}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Picks sidebar */}
      <div className="space-y-4 lg:sticky lg:top-32 lg:self-start">
        <TournamentPicks
          leagueId={params.id}
          locked={league.groupLocked || league.knockoutLocked}
          currentWinnerId={picks?.winnerPick?.nationalTeamId}
          currentScorerId={picks?.topScorerPick?.playerId}
          teams={teams.map((t) => ({ id: t.id, name: t.name, code: t.code, eliminated: t.eliminated }))}
          players={players.map((p) => ({
            id: p.id,
            name: p.name,
            teamName: p.nationalTeam.name,
            teamCode: p.nationalTeam.code,
            eliminated: p.nationalTeam.eliminated,
          }))}
        />

        <Card>
          <CardContent className="space-y-2 p-5 text-sm">
            <h3 className="section-title mb-2">Scoring</h3>
            <div className="flex justify-between"><span className="text-muted-foreground">Exact score</span><span className="font-semibold text-gold">{league.exactPoints} pts</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Correct outcome</span><span className="font-semibold">{league.outcomePoints} pts</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Golden match</span><span className="font-semibold text-gold">×2</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Joker <span className="text-[10px]">(1 / phase)</span></span><span className="font-semibold text-gold">×2</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Power Pick <span className="text-[10px]">(1 / matchday)</span></span><span className="font-semibold text-gold">×1.5</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">3-in-a-row streak</span><span className="font-semibold">+5</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">5-in-a-row streak</span><span className="font-semibold">+15</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
