import { Globe2, Footprints } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { setTeamEliminated } from "@/app/actions/admin";
import { TopScorerSelect } from "@/components/admin/top-scorer-select";
import { ActionButton } from "@/components/admin/action-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { flagEmoji } from "@/lib/flags";

export const dynamic = "force-dynamic";

export default async function TournamentAdmin() {
  const [teams, players, currentScorer] = await Promise.all([
    prisma.nationalTeam.findMany({ orderBy: [{ group: "asc" }, { name: "asc" }] }),
    prisma.player.findMany({ include: { nationalTeam: true }, orderBy: { name: "asc" } }),
    prisma.player.findFirst({ where: { isTopScorer: true } }),
  ]);

  const byGroup = new Map<string, typeof teams>();
  for (const t of teams) {
    const g = t.group ?? "?";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(t);
  }

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardContent className="p-5">
          <h3 className="mb-1 flex items-center gap-2 font-display font-bold">
            <Footprints className="h-5 w-5 text-gold" /> Tournament Top Scorer
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Setting the Golden Boot winner awards the +25 bonus to everyone who picked them.
          </p>
          <TopScorerSelect
            current={currentScorer?.id}
            players={players.map((p) => ({ id: p.id, name: p.name, teamName: p.nationalTeam.name, teamCode: p.nationalTeam.code }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-1 flex items-center gap-2 font-display font-bold">
            <Globe2 className="h-5 w-5 text-gold" /> Team Elimination
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Mark teams as eliminated to unlock the one-time Winner / Top Scorer replacement for affected managers.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...byGroup.entries()].map(([group, gt]) => (
              <div key={group} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold/80">Group {group}</div>
                <div className="space-y-1.5">
                  {gt.map((t) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm">
                        {flagEmoji(t.code)} {t.name}
                        {t.eliminated && <Badge variant="danger">OUT</Badge>}
                      </span>
                      <ActionButton
                        action={setTeamEliminated}
                        fields={{ teamId: t.id, eliminated: (!t.eliminated).toString() }}
                        variant={t.eliminated ? "secondary" : "danger"}
                      >
                        {t.eliminated ? "Restore" : "Eliminate"}
                      </ActionButton>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
