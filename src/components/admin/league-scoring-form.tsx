"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sliders, Loader2, Check } from "lucide-react";
import { updateLeagueScoring } from "@/app/actions/admin";

type Cfg = { exactPoints: number; outcomePoints: number; winnerBonus: number; topScorerBonus: number };

export function LeagueScoringForm({ leagueId, cfg }: { leagueId: string; cfg: Cfg }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("leagueId", leagueId);
    start(async () => {
      await updateLeagueScoring(fd);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
      router.refresh();
    });
  }

  const field = (name: keyof Cfg, label: string) => (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input name={name} type="number" min={0} defaultValue={cfg[name]}
        className="h-8 w-16 rounded-lg border border-input bg-black/30 text-center text-sm focus-visible:outline-none" />
    </label>
  );

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-gold">
        <Sliders className="h-3.5 w-3.5" /> Scoring settings {open ? "▲" : "▼"}
      </button>
      {open && (
        <form onSubmit={onSubmit} className="mt-2 flex flex-wrap items-end gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
          {field("exactPoints", "Exact score")}
          {field("outcomePoints", "Correct outcome")}
          {field("winnerBonus", "Winner bonus")}
          {field("topScorerBonus", "Top scorer bonus")}
          <button type="submit" disabled={pending}
            className="flex items-center gap-1 rounded-lg btn-gold px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : done ? <Check className="h-3 w-3" /> : null} Save & recalc
          </button>
        </form>
      )}
    </div>
  );
}
