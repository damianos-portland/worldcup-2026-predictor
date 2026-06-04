"use client";

import { useState, useTransition } from "react";
import { Crown, Footprints, Check, Loader2 } from "lucide-react";
import { saveWinnerPick, saveTopScorerPick } from "@/app/actions/predictions";
import { Card, CardContent } from "@/components/ui/card";
import { flagEmoji } from "@/lib/flags";

type Team = { id: string; name: string; code: string; eliminated: boolean };
type Player = { id: string; name: string; teamName: string; teamCode: string; eliminated: boolean };

export function TournamentPicks({
  leagueId,
  teams,
  players,
  currentWinnerId,
  currentScorerId,
  locked,
}: {
  leagueId: string;
  teams: Team[];
  players: Player[];
  currentWinnerId?: string;
  currentScorerId?: string;
  locked: boolean;
}) {
  const [winner, setWinner] = useState(currentWinnerId ?? "");
  const [scorer, setScorer] = useState(currentScorerId ?? "");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  function saveWinner(value: string) {
    setWinner(value);
    const fd = new FormData();
    fd.set("leagueId", leagueId);
    fd.set("nationalTeamId", value);
    start(async () => {
      const res = await saveWinnerPick(fd);
      setMsg(res?.error ?? "Winner pick saved");
      setTimeout(() => setMsg(""), 2500);
    });
  }

  function saveScorer(value: string) {
    setScorer(value);
    const fd = new FormData();
    fd.set("leagueId", leagueId);
    fd.set("playerId", value);
    start(async () => {
      const res = await saveTopScorerPick(fd);
      setMsg(res?.error ?? "Top scorer pick saved");
      setTimeout(() => setMsg(""), 2500);
    });
  }

  const selectClass =
    "h-11 w-full rounded-xl border border-input bg-black/30 px-3 text-sm text-foreground focus-visible:border-gold/50 focus-visible:outline-none disabled:opacity-60";

  return (
    <Card className="glass-strong">
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="flex items-center gap-2 font-display font-bold">
            <Crown className="h-5 w-5 text-gold" /> Tournament Bonuses
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            +30 pts if your champion lifts the trophy · +25 pts for the Golden Boot.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tournament Winner
          </label>
          <select value={winner} onChange={(e) => saveWinner(e.target.value)} className={selectClass} disabled={locked && !winner}>
            <option value="">Select a champion…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.eliminated && t.id !== winner}>
                {flagEmoji(t.code)} {t.name}{t.eliminated ? " (eliminated)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Footprints className="h-3.5 w-3.5" /> Top Scorer
          </label>
          <select value={scorer} onChange={(e) => saveScorer(e.target.value)} className={selectClass} disabled={locked && !scorer}>
            <option value="">Select a striker…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.eliminated && p.id !== scorer}>
                {flagEmoji(p.teamCode)} {p.name} · {p.teamName}{p.eliminated ? " (out)" : ""}
              </option>
            ))}
          </select>
        </div>

        {msg && (
          <p className="flex items-center gap-1.5 text-xs text-gold">
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            {msg}
          </p>
        )}
        {locked && (
          <p className="text-xs text-muted-foreground">
            Group stage locked — you may only replace a pick once it has been
            eliminated, and a replacement scores <span className="text-gold">half</span> the bonus.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
