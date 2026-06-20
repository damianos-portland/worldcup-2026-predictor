"use client";

import { useEffect, useRef, useState } from "react";
import { Target, CheckCircle2, Star } from "lucide-react";
import { Flag } from "@/components/flag";

export type ScoreItem = {
  home: string;
  homeCode: string;
  away: string;
  awayCode: string;
  predHs: number; // the team's prediction
  predAs: number;
  resHs: number; // the actual result
  resAs: number;
  powerPick: boolean;
};

const POPUP_W = 300; // matches w-[300px]
const GAP = 4; // px between the number and the popup

// Click a team's Exact / Outcome count to see which matches it covers. For exact
// scores pred == result (one score shown); for outcomes we also show their pick
// under the real result. Uses position:fixed so the table's overflow can't clip it.
export function ScoresCell({
  count,
  items,
  variant,
}: {
  count: number;
  items: ScoreItem[];
  variant: "exact" | "outcome";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean; caretLeft: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const title = variant === "exact" ? "Exact scores" : "Correct outcomes";
  const Icon = variant === "exact" ? Target : CheckCircle2;

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const el = ref.current;
    if (!el || items.length === 0) return;
    const r = el.getBoundingClientRect();
    const centerX = r.left + r.width / 2; // the number's centre
    const left = Math.max(POPUP_W / 2 + 8, Math.min(centerX, window.innerWidth - POPUP_W / 2 - 8));
    // Caret tracks the number even when the popup is clamped to a screen edge.
    const caretLeft = Math.max(16, Math.min(centerX - left + POPUP_W / 2, POPUP_W - 16));
    // Open downward unless the number is low on screen, then flip above.
    const below = r.bottom < window.innerHeight * 0.6;
    setPos({ top: below ? r.bottom + GAP : r.top - GAP, left, below, caretLeft });
    setOpen(true);
  }

  // Close on outside click, Escape, or scroll (so the fixed popup can't drift).
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || ref.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScroll(e: Event) {
      // Scrolling the popup's own list must not close it — only outside scroll
      // (the page/table) should, since the fixed popup can't follow that.
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  if (count === 0) return <span className="text-muted-foreground">0</span>;

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`${count} ${title.toLowerCase()}`}
        className={
          "cursor-pointer font-semibold underline decoration-dotted decoration-white/40 underline-offset-4 transition-colors hover:text-gold" +
          (open ? " text-gold" : "")
        }
      >
        {count}
      </button>

      {open && pos && (
        <div
          ref={popRef}
          style={{
            top: pos.top,
            left: pos.left,
            transform: `translateX(-50%)${pos.below ? "" : " translateY(-100%)"}`,
          }}
          className="fixed z-50 w-[300px] rounded-xl border border-gold/30 bg-pitch-900/95 p-3 text-left shadow-2xl shadow-black/50 ring-1 ring-gold/10 backdrop-blur"
        >
          {/* caret pointing at the number */}
          <span
            aria-hidden
            className="absolute h-2.5 w-2.5 rotate-45 border-gold/30 bg-pitch-900"
            style={{
              left: pos.caretLeft,
              marginLeft: -5,
              ...(pos.below
                ? { top: -5, borderLeftWidth: 1, borderTopWidth: 1 }
                : { bottom: -5, borderRightWidth: 1, borderBottomWidth: 1 }),
            }}
          />
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gold">
            <Icon className="h-3.5 w-3.5" /> {title} ({count})
          </div>
          <ul className="max-h-[56vh] space-y-1.5 overflow-y-auto">
            {items.map((it, i) => {
              const inexact = it.predHs !== it.resHs || it.predAs !== it.resAs;
              return (
                <li key={i} className="border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex min-w-0 flex-1 items-center justify-end gap-1 text-right">
                      <span className="truncate">{it.home}</span>
                      <span className="text-base leading-none">
                        <Flag code={it.homeCode} showName={false} />
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 font-bold text-foreground">
                      {it.resHs}–{it.resAs}
                      {it.powerPick && <Star className="h-3 w-3 text-gold" aria-label="Power Pick" />}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-1">
                      <span className="text-base leading-none">
                        <Flag code={it.awayCode} showName={false} />
                      </span>
                      <span className="truncate">{it.away}</span>
                    </span>
                  </div>
                  {inexact && (
                    <div className="mt-0.5 text-center text-[10px] text-muted-foreground">
                      your pick {it.predHs}–{it.predAs}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
