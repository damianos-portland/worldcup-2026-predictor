"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Footprints } from "lucide-react";
import { setTopScorer } from "@/app/actions/admin";
import { flagEmoji } from "@/lib/flags";

export function TopScorerSelect({
  players,
  current,
}: {
  players: { id: string; name: string; teamName: string; teamCode: string }[];
  current?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [pending, start] = useTransition();

  function onChange(v: string) {
    setValue(v);
    const fd = new FormData();
    fd.set("playerId", v);
    start(async () => {
      await setTopScorer(fd);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Footprints className="h-4 w-4 text-gold" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 flex-1 rounded-xl border border-input bg-black/30 px-3 text-sm focus-visible:outline-none"
      >
        <option value="">— No top scorer set —</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {flagEmoji(p.teamCode)} {p.name} · {p.teamName}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
    </div>
  );
}
