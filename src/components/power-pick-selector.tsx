"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Check, Loader2, Lock } from "lucide-react";
import { togglePowerPick } from "@/app/actions/predictions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/flag";
import { cn, formatKickoff } from "@/lib/utils";

export type PPMatch = {
  id: string;
  homeName?: string | null;
  homeCode?: string | null;
  awayName?: string | null;
  awayCode?: string | null;
  slot?: string | null;
  kickoff: string;
  isGolden: boolean;
  predicted: boolean;
  predictionText: string | null;
  powerPick: boolean;
  locked: boolean;
};

export type PPMatchday = { key: string; label: string; matches: PPMatch[] };

export function PowerPickSelector({ leagueId, matchdays }: { leagueId: string; matchdays: PPMatchday[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, start] = useTransition();

  function select(matchId: string) {
    setError("");
    setPendingId(matchId);
    const fd = new FormData();
    fd.set("leagueId", leagueId);
    fd.set("matchId", matchId);
    start(async () => {
      const res = await togglePowerPick(fd);
      if (res?.error) setError(res.error);
      setPendingId(null);
      router.refresh();
    });
  }

  if (matchdays.length === 0) {
    return (
      <Card><CardContent className="flex flex-col items-center gap-2 py-14 text-center">
        <Star className="h-8 w-8 text-muted-foreground" />
        <h3 className="font-display text-lg font-semibold">No matchdays open yet</h3>
        <p className="max-w-sm text-sm text-muted-foreground">Your Power Pick options will appear here as fixtures open.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      )}
      {matchdays.map((md) => {
        const chosen = md.matches.find((m) => m.powerPick);
        return (
          <Card key={md.key}>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="section-title">{md.label}</h3>
                {chosen ? (
                  <Badge variant="gold"><Star className="h-3 w-3" /> {chosen.homeName} v {chosen.awayName}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Pick one match · ×1.5</span>
                )}
              </div>
              <div className="grid gap-2">
                {md.matches.map((m) => {
                  const disabled = m.locked || (!m.predicted && !m.powerPick) || pendingId === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => !disabled && select(m.id)}
                      disabled={disabled}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                        m.powerPick
                          ? "border-gold/50 bg-gold/10"
                          : "border-white/5 bg-white/[0.02] enabled:hover:border-gold/30 disabled:opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border", m.powerPick ? "border-gold bg-gold text-pitch-900" : "border-white/20")}>
                          {pendingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : m.powerPick ? <Star className="h-3.5 w-3.5" /> : null}
                        </span>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Flag code={m.homeCode} name={m.homeName ?? m.slot ?? "TBD"} showName={!!m.homeName} />
                          <span className="text-muted-foreground">v</span>
                          <Flag code={m.awayCode} name={m.awayName ?? "TBD"} reverse showName={!!m.awayName} />
                          {m.isGolden && <Badge variant="gold">Golden</Badge>}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        {m.locked ? (
                          <span className="flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" /> Locked</span>
                        ) : m.predicted ? (
                          <span className="flex items-center gap-1 text-emerald-300"><Check className="h-3 w-3" /> {m.predictionText}</span>
                        ) : (
                          <span className="text-muted-foreground">Predict first</span>
                        )}
                        <div className="mt-0.5 text-muted-foreground">{formatKickoff(new Date(m.kickoff))}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
