"use client";

import { useRef, useState } from "react";
import { Target, Star } from "lucide-react";
import { Flag } from "@/components/flag";

export type ExactItem = {
  home: string;
  homeCode: string;
  away: string;
  awayCode: string;
  hs: number;
  as: number;
  powerPick: boolean;
};

const POPUP_W = 288; // matches w-72

// Hover a team's "Exact" count to see exactly which scorelines they nailed.
// Uses position:fixed (viewport coords) so the table's overflow-x-auto can't clip it.
export function ExactScoresCell({ count, items }: { count: number; items: ExactItem[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (timer.current) clearTimeout(timer.current);
    const el = ref.current;
    if (!el || items.length === 0) return;
    const r = el.getBoundingClientRect();
    const left = Math.max(
      POPUP_W / 2 + 8,
      Math.min(r.left + r.width / 2, window.innerWidth - POPUP_W / 2 - 8)
    );
    const below = r.top < window.innerHeight * 0.55;
    setPos({ top: below ? r.bottom + 8 : r.top - 8, left, below });
    setOpen(true);
  }
  function scheduleHide() {
    timer.current = setTimeout(() => setOpen(false), 120);
  }

  if (count === 0) return <span className="text-muted-foreground">0</span>;

  return (
    <>
      <button
        ref={ref}
        type="button"
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={scheduleHide}
        aria-label={`${count} exact scores`}
        className="cursor-help font-semibold underline decoration-dotted decoration-white/40 underline-offset-4 transition-colors hover:text-gold"
      >
        {count}
      </button>

      {open && pos && (
        <div
          onMouseEnter={show}
          onMouseLeave={scheduleHide}
          style={{
            top: pos.top,
            left: pos.left,
            transform: `translateX(-50%)${pos.below ? "" : " translateY(-100%)"}`,
          }}
          className="fixed z-50 max-h-[60vh] w-72 overflow-y-auto rounded-xl border border-gold/30 bg-pitch-900/95 p-3 text-left shadow-2xl shadow-black/50 ring-1 ring-gold/10 backdrop-blur"
        >
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gold">
            <Target className="h-3.5 w-3.5" /> Exact scores ({count})
          </div>
          <ul className="space-y-1.5">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span className="flex min-w-0 flex-1 items-center justify-end gap-1 text-right">
                  <span className="truncate">{it.home}</span>
                  <span className="text-base leading-none">
                    <Flag code={it.homeCode} showName={false} />
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 font-bold text-foreground">
                  {it.hs}–{it.as}
                  {it.powerPick && <Star className="h-3 w-3 text-gold" aria-label="Power Pick" />}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-1">
                  <span className="text-base leading-none">
                    <Flag code={it.awayCode} showName={false} />
                  </span>
                  <span className="truncate">{it.away}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
