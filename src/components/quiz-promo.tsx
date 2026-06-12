"use client";

import { useEffect, useState } from "react";
import { X, BarChart3, ArrowUpRight } from "lucide-react";

// Cross-promo for the analytics companion site, shown on the quiz tab.
const PROMO_URL = "https://wc2026-predictor-puce.vercel.app/";
const DISMISS_KEY = "wc-quiz-analytics-promo-dismissed";

export function QuizPromo() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    // Slide in a moment after the page settles so it catches the eye.
    const t = setTimeout(() => setShow(true), 600);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,22rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-pitch-900/95 p-4 shadow-2xl shadow-black/50 ring-1 ring-gold/10 backdrop-blur">
        {/* gold glow accent */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gold/20 blur-2xl" />

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-start gap-3 pr-5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div className="space-y-2">
            <p className="text-sm font-semibold leading-snug">Struggling to answer the questions?</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              See what the <span className="text-gold">analytics</span> say before you lock in your picks.
            </p>
            <a
              href={PROMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-pitch-900 transition-transform hover:scale-[1.03]"
            >
              View the analytics <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
