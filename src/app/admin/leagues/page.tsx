import { Users, Lock, Sparkles, Flag as FlagIcon, RefreshCw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { setLeaguePhase, recalcLeagueAction } from "@/app/actions/admin";
import { CreateLeague } from "@/components/admin/create-league";
import { ActionButton } from "@/components/admin/action-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminLeagues() {
  const leagues = await prisma.league.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { memberships: true } },
      memberships: {
        orderBy: { totalPoints: "desc" },
        take: 3,
        include: { user: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardContent className="p-5">
          <h3 className="mb-4 font-display font-bold">Create League</h3>
          <CreateLeague />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {leagues.map((l) => (
          <Card key={l.id}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold">{l.name}</h3>
                    <Badge variant="secondary" className="font-mono">{l.code}</Badge>
                    <Badge variant={l.phase === "FINISHED" ? "success" : "default"}>{l.phase}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {l._count.memberships} managers</span>
                    {l.groupLocked && <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Group locked</span>}
                    {l.knockoutOpen && <span className="flex items-center gap-1 text-gold"><Sparkles className="h-3.5 w-3.5" /> Knockouts open</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton action={setLeaguePhase} fields={{ leagueId: l.id, action: "LOCK_GROUP" }} variant="secondary">
                    <Lock className="h-3 w-3" /> Lock Group
                  </ActionButton>
                  <ActionButton action={setLeaguePhase} fields={{ leagueId: l.id, action: "OPEN_KNOCKOUT" }} variant="gold">
                    <Sparkles className="h-3 w-3" /> Open Knockouts
                  </ActionButton>
                  <ActionButton action={setLeaguePhase} fields={{ leagueId: l.id, action: "FINISH" }} variant="secondary">
                    <FlagIcon className="h-3 w-3" /> Finish
                  </ActionButton>
                  <ActionButton action={recalcLeagueAction} fields={{ leagueId: l.id }} variant="secondary">
                    <RefreshCw className="h-3 w-3" /> Recalculate
                  </ActionButton>
                </div>
              </div>

              {l.memberships.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {l.memberships.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs">
                      <span className="font-bold text-gold">#{i + 1}</span>
                      <span className="font-semibold">{m.teamName}</span>
                      <span className="text-muted-foreground">{m.totalPoints} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
