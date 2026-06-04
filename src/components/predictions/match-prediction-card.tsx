"use client";

import { useState, useTransition } from "react";
import { Sparkles, Check, Lock, Loader2, Star } from "lucide-react";
import { savePrediction, toggleJoker, togglePowerPick } from "@/app/actions/predictions";
import { Flag } from "@/components/flag";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatKickoff } from "@/lib/utils";

type Props = {
  leagueId: string;
  match: {
    id: string;
    status: "UPCOMING" | "LOCKED" | "LIVE" | "FINISHED";
    isGolden: boolean;
    kickoff: string;
    homeName?: string | null;
    homeCode?: string | null;
    awayName?: string | null;
    awayCode?: string | null;
    homeScore: number | null;
    awayScore: number | null;
    slot?: string | null;
  };
  prediction?: {
    homeScore: number;
    awayScore: number;
    jokerUsed: boolean;
    powerPick: boolean;
    points: number;
    scored: boolean;
    isExact: boolean;
  } | null;
  jokerAvailable: boolean;
};

export function MatchPredictionCard({ leagueId, match, prediction, jokerAvailable }: Props) {
  const [home, setHome] = useState(prediction?.homeScore?.toString() ?? "");
  const [away, setAway] = useState(prediction?.awayScore?.toString() ?? "");
  const [joker, setJoker] = useState(prediction?.jokerUsed ?? false);
  const [power, setPower] = useState(prediction?.powerPick ?? false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const locked = match.status !== "UPCOMING";

  function save() {
    if (home === "" || away === "") return;
    setError("");
    const fd = new FormData();
    fd.set("leagueId", leagueId);
    fd.set("matchId", match.id);
    fd.set("homeScore", home);
    fd.set("awayScore", away);
    start(async () => {
      const res = await savePrediction(fd);
      if (res?.error) setError(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  function onJoker() {
    const fd = new FormData();
    fd.set("leagueId", leagueId);
    fd.set("matchId", match.id);
    start(async () => {
      const res = await toggleJoker(fd);
      if (res?.error) setError(res.error);
      else setJoker((j) => !j);
    });
  }

  function onPower() {
    const fd = new FormData();
    fd.set("leagueId", leagueId);
    fd.set("matchId", match.id);
    start(async () => {
      const res = await togglePowerPick(fd);
      if (res?.error) setError(res.error);
      else setPower((p) => !p);
    });
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white/[0.02] p-4 transition-colors",
        match.isGolden ? "border-gold/40 bg-gold/[0.04]" : "border-white/5",
        (joker || power) && "ring-1 ring-gold/50"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{formatKickoff(new Date(match.kickoff))}</span>
        <div className="flex items-center gap-1.5">
          {match.isGolden && <Badge variant="gold"><Sparkles className="h-3 w-3" /> Golden</Badge>}
          {match.status === "LOCKED" && <Badge variant="secondary"><Lock className="h-3 w-3" /> Locked</Badge>}
          {match.status === "FINISHED" && <Badge variant="success">Final</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center justify-end gap-2 text-right text-sm font-semibold">
          <span className="truncate">{match.homeName ?? match.slot ?? "TBD"}</span>
          <span className="text-xl">{match.homeCode ? <Flag code={match.homeCode} showName={false} /> : null}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={home}
            disabled={locked}
            onChange={(e) => setHome(e.target.value)}
            onBlur={save}
            className="h-12 w-12 rounded-xl border border-input bg-black/30 text-center text-lg font-bold text-foreground focus-visible:border-gold/50 focus-visible:outline-none disabled:opacity-60"
            placeholder="–"
          />
          <span className="text-muted-foreground">:</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={away}
            disabled={locked}
            onChange={(e) => setAway(e.target.value)}
            onBlur={save}
            className="h-12 w-12 rounded-xl border border-input bg-black/30 text-center text-lg font-bold text-foreground focus-visible:border-gold/50 focus-visible:outline-none disabled:opacity-60"
            placeholder="–"
          />
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-xl">{match.awayCode ? <Flag code={match.awayCode} showName={false} /> : null}</span>
          <span className="truncate">{match.awayName ?? "TBD"}</span>
        </div>
      </div>

      {/* Result / footer */}
      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <div className="text-xs">
          {match.status === "FINISHED" ? (
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">
                Result <span className="font-semibold text-foreground">{match.homeScore} - {match.awayScore}</span>
              </span>
              {prediction?.scored && (
                <Badge variant={prediction.isExact ? "gold" : prediction.points > 0 ? "success" : "secondary"}>
                  +{prediction.points} pts
                </Badge>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {pending ? (
                <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>
              ) : saved ? (
                <span className="flex items-center gap-1 text-emerald-300"><Check className="h-3 w-3" /> Saved</span>
              ) : prediction ? (
                "Prediction saved"
              ) : (
                "Enter your score"
              )}
            </span>
          )}
        </div>

        {!locked && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPower}
              disabled={pending || !prediction}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-40",
                power
                  ? "border-gold/50 bg-gold/15 text-gold"
                  : "border-white/10 text-muted-foreground hover:border-gold/40 hover:text-gold"
              )}
              title={!prediction ? "Save a prediction first" : "Boost this match's points ×1.5 (one per matchday)"}
            >
              <Star className="h-3.5 w-3.5" /> {power ? "Power Pick ×1.5" : "Power Pick"}
            </button>
            <button
              onClick={onJoker}
              disabled={pending || (!joker && !jokerAvailable) || !prediction}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-40",
                joker
                  ? "border-gold/50 bg-gold/15 text-gold"
                  : "border-white/10 text-muted-foreground hover:border-gold/40 hover:text-gold"
              )}
              title={!prediction ? "Save a prediction first" : "Double this match's points"}
            >
              <Sparkles className="h-3.5 w-3.5" /> {joker ? "Joker active" : "Joker"}
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}
