import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MatchRow } from "@/components/admin/match-row";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROUND_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MatchCenter({ searchParams }: { searchParams: { phase?: string } }) {
  const phase = searchParams.phase === "KNOCKOUT" ? "KNOCKOUT" : "GROUP";

  const [matches, teams] = await Promise.all([
    prisma.match.findMany({
      where: { phase: phase as any },
      orderBy: { kickoff: "asc" },
      include: { homeTeam: true, awayTeam: true },
    }),
    prisma.nationalTeam.findMany({ orderBy: { name: "asc" } }),
  ]);

  const teamOpts = teams.map((t) => ({ id: t.id, name: t.name, code: t.code }));

  const sections = new Map<string, typeof matches>();
  for (const m of matches) {
    const key = phase === "GROUP" ? `Group ${m.group}` : ROUND_LABELS[m.round] ?? m.round;
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key)!.push(m);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <ClipboardList className="h-5 w-5 text-gold" /> Match Center
        </h2>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <a href="/admin/matches?phase=GROUP" className={`rounded-lg px-3 py-1.5 text-sm font-medium ${phase === "GROUP" ? "btn-gold" : "text-muted-foreground"}`}>Group Stage</a>
          <a href="/admin/matches?phase=KNOCKOUT" className={`rounded-lg px-3 py-1.5 text-sm font-medium ${phase === "KNOCKOUT" ? "btn-gold" : "text-muted-foreground"}`}>Knockouts</a>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Enter official results to automatically recalculate every league's standings, statistics and achievements.
      </p>

      {[...sections.entries()].map(([title, group]) => (
        <Card key={title}>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="section-title">{title}</h3>
              <Badge variant="secondary">{group.length}</Badge>
            </div>
            <div className="grid gap-2">
              {group.map((m) => (
                <MatchRow
                  key={m.id}
                  teams={teamOpts}
                  match={{
                    id: m.id,
                    status: m.status,
                    isGolden: m.isGolden,
                    kickoff: m.kickoff.toISOString(),
                    phase: m.phase as "GROUP" | "KNOCKOUT",
                    homeId: m.homeTeamId,
                    awayId: m.awayTeamId,
                    homeName: m.homeTeam?.name,
                    homeCode: m.homeTeam?.code,
                    awayName: m.awayTeam?.name,
                    awayCode: m.awayTeam?.code,
                    homeScore: m.homeScore,
                    awayScore: m.awayScore,
                    slot: m.slot,
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
