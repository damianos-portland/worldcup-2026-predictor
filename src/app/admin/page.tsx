import Link from "next/link";
import { Users, Globe2, ClipboardList, CheckCircle2, Trophy, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CreateLeague } from "@/components/admin/create-league";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [leagueCount, userCount, matchCount, finishedCount, leagues] = await Promise.all([
    prisma.league.count(),
    prisma.user.count(),
    prisma.match.count(),
    prisma.match.count({ where: { status: "FINISHED" } }),
    prisma.league.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { memberships: true } } },
    }),
  ]);

  const stats = [
    { label: "Leagues", value: leagueCount, icon: Globe2 },
    { label: "Users", value: userCount, icon: Users },
    { label: "Matches", value: matchCount, icon: ClipboardList },
    { label: "Results In", value: finishedCount, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="card-hover">
            <CardContent className="p-4">
              <s.icon className="h-5 w-5 text-gold" />
              <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-strong">
        <CardContent className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display font-bold">
            <Plus className="h-5 w-5 text-gold" /> Create a New League
          </h3>
          <CreateLeague />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="section-title mb-4 flex items-center gap-2"><Trophy className="h-3.5 w-3.5" /> All Leagues</h3>
          {leagues.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No leagues yet — create one above.</p>
          ) : (
            <div className="space-y-2">
              {leagues.map((l) => (
                <Link key={l.id} href="/admin/leagues" className="block">
                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 hover:border-gold/30">
                    <div>
                      <div className="font-semibold">{l.name}</div>
                      <div className="font-mono text-xs text-gold/80">{l.code}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{l._count.memberships} 👥</Badge>
                      <Badge variant={l.phase === "FINISHED" ? "success" : "default"}>{l.phase}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
