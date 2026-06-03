import { Medal, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMembershipOrRedirect } from "@/lib/league-access";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { AchievementIcon } from "@/components/achievement-icon";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AchievementsPage({ params }: { params: { id: string } }) {
  const { membership } = await getMembershipOrRedirect(params.id);
  const unlocked = await prisma.achievement.findMany({ where: { membershipId: membership.id } });
  const unlockedKeys = new Set(unlocked.map((a) => a.type));

  const count = unlockedKeys.size;

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
              <Medal className="h-6 w-6 text-gold" /> Achievements
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Unlock badges as you dominate the predictions.
            </p>
          </div>
          <div className="text-center">
            <div className="font-display text-3xl font-bold gold-text">{count}/{ACHIEVEMENTS.length}</div>
            <div className="text-xs text-muted-foreground">unlocked</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const got = unlockedKeys.has(a.key);
          return (
            <Card key={a.key} className={cn("relative overflow-hidden", got ? "border-gold/40 card-hover" : "opacity-60")}>
              <CardContent className="flex items-start gap-4 p-5">
                <div className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                  got ? "btn-gold" : "bg-white/5 text-muted-foreground"
                )}>
                  {got ? <AchievementIcon name={a.icon} className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-display font-semibold">{a.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                  {got && <span className="mt-2 inline-block text-xs font-semibold text-gold">Unlocked ✓</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
