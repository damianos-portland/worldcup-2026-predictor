"use client";

import { Share2 } from "lucide-react";

/** Opens the auto-generated podium image, ready to save & share. */
export function SharePodium({ leagueId }: { leagueId: string }) {
  return (
    <a
      href={`/api/og/league/${leagueId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-xl border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/10"
    >
      <Share2 className="h-3.5 w-3.5" /> Share podium
    </a>
  );
}
