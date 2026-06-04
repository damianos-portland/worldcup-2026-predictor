"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Sparkles, Loader2, Lock, Check, Radio, Goal } from "lucide-react";
import { enterResult, setMatchStatus, markGoldenMatch, setKnockoutTeams, updateLiveScore, postMatchEvent } from "@/app/actions/admin";
import { flagEmoji } from "@/lib/flags";
import { Badge } from "@/components/ui/badge";
import { formatKickoff, cn } from "@/lib/utils";

type TeamOpt = { id: string; name: string; code: string };

export function MatchRow({
  match,
  teams,
}: {
  match: {
    id: string;
    status: "UPCOMING" | "LOCKED" | "LIVE" | "FINISHED";
    isGolden: boolean;
    kickoff: string;
    phase: "GROUP" | "KNOCKOUT";
    homeId?: string | null;
    awayId?: string | null;
    homeName?: string | null;
    homeCode?: string | null;
    awayName?: string | null;
    awayCode?: string | null;
    homeScore: number | null;
    awayScore: number | null;
    liveHomeScore?: number | null;
    liveAwayScore?: number | null;
    minute?: string | null;
    slot?: string | null;
  };
  teams: TeamOpt[];
}) {
  const router = useRouter();
  const [home, setHome] = useState(match.homeScore?.toString() ?? "");
  const [away, setAway] = useState(match.awayScore?.toString() ?? "");
  const [homeId, setHomeId] = useState(match.homeId ?? "");
  const [awayId, setAwayId] = useState(match.awayId ?? "");
  const [lh, setLh] = useState(match.liveHomeScore?.toString() ?? "0");
  const [la, setLa] = useState(match.liveAwayScore?.toString() ?? "0");
  const [min, setMin] = useState(match.minute ?? "");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  function run(fn: () => Promise<any>) {
    start(async () => {
      await fn();
      setDone(true);
      setTimeout(() => setDone(false), 1200);
      router.refresh();
    });
  }

  function saveResult() {
    if (home === "" || away === "") return;
    const fd = new FormData();
    fd.set("matchId", match.id);
    fd.set("homeScore", home);
    fd.set("awayScore", away);
    run(() => enterResult(fd));
  }

  function changeStatus(status: string) {
    const fd = new FormData();
    fd.set("matchId", match.id);
    fd.set("status", status);
    run(() => setMatchStatus(fd));
  }

  function toggleGolden() {
    const fd = new FormData();
    fd.set("matchId", match.id);
    run(() => markGoldenMatch(fd));
  }

  function saveLive() {
    const fd = new FormData();
    fd.set("matchId", match.id);
    fd.set("liveHomeScore", lh);
    fd.set("liveAwayScore", la);
    fd.set("minute", min);
    run(() => updateLiveScore(fd));
  }

  function addGoal(side: "HOME" | "AWAY") {
    if (side === "HOME") setLh((v) => String((parseInt(v, 10) || 0) + 1));
    else setLa((v) => String((parseInt(v, 10) || 0) + 1));
    const fd = new FormData();
    fd.set("matchId", match.id);
    fd.set("type", "GOAL");
    fd.set("side", side);
    fd.set("minute", min);
    const live = new FormData();
    live.set("matchId", match.id);
    live.set("liveHomeScore", side === "HOME" ? String((parseInt(lh, 10) || 0) + 1) : lh);
    live.set("liveAwayScore", side === "AWAY" ? String((parseInt(la, 10) || 0) + 1) : la);
    live.set("minute", min);
    run(async () => {
      await postMatchEvent(fd);
      await updateLiveScore(live);
    });
  }

  function assignTeams() {
    const fd = new FormData();
    fd.set("matchId", match.id);
    fd.set("homeTeamId", homeId);
    fd.set("awayTeamId", awayId);
    run(() => setKnockoutTeams(fd));
  }

  const needsTeams = !match.homeName || !match.awayName;
  const selectClass = "h-9 rounded-lg border border-input bg-black/30 px-2 text-xs text-foreground focus-visible:outline-none";

  return (
    <div className={cn("rounded-xl border bg-white/[0.02] p-3", match.isGolden ? "border-gold/40" : "border-white/5")}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{formatKickoff(new Date(match.kickoff))}</span>
        <div className="flex items-center gap-1.5">
          {match.isGolden && <Badge variant="gold"><Sparkles className="h-3 w-3" /> Golden</Badge>}
          <Badge variant={match.status === "FINISHED" ? "success" : match.status === "LOCKED" ? "secondary" : "default"}>
            {match.status}
          </Badge>
        </div>
      </div>

      {needsTeams && match.phase === "KNOCKOUT" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{match.slot}</span>
          <select value={homeId} onChange={(e) => setHomeId(e.target.value)} className={selectClass}>
            <option value="">Home team…</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={awayId} onChange={(e) => setAwayId(e.target.value)} className={selectClass}>
            <option value="">Away team…</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={assignTeams} disabled={pending} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
            Assign
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
            <span>{match.homeCode ? flagEmoji(match.homeCode) : "🏳️"}</span>
            <span className="truncate">{match.homeName ?? match.slot}</span>
          </div>
          <div className="flex items-center gap-1">
            <input type="number" min={0} value={home} onChange={(e) => setHome(e.target.value)}
              className="h-9 w-12 rounded-lg border border-input bg-black/30 text-center text-sm font-bold focus-visible:outline-none" placeholder="–" />
            <span className="text-muted-foreground">:</span>
            <input type="number" min={0} value={away} onChange={(e) => setAway(e.target.value)}
              className="h-9 w-12 rounded-lg border border-input bg-black/30 text-center text-sm font-bold focus-visible:outline-none" placeholder="–" />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-sm font-semibold">
            <span className="truncate">{match.awayName ?? "TBD"}</span>
            <span>{match.awayCode ? flagEmoji(match.awayCode) : "🏳️"}</span>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-2">
        <button onClick={saveResult} disabled={pending || needsTeams}
          className="flex items-center gap-1 rounded-lg btn-gold px-2.5 py-1 text-xs font-semibold disabled:opacity-40">
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : done ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
          Save Result
        </button>
        <select value={match.status} onChange={(e) => changeStatus(e.target.value)} className={selectClass}>
          <option value="UPCOMING">Upcoming</option>
          <option value="LOCKED">Locked</option>
          <option value="LIVE">Live</option>
          <option value="FINISHED">Finished</option>
        </select>
        <button onClick={toggleGolden} disabled={pending}
          className={cn("flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold",
            match.isGolden ? "border-gold/50 bg-gold/15 text-gold" : "border-white/10 text-muted-foreground hover:text-gold")}>
          <Sparkles className="h-3 w-3" /> {match.isGolden ? "Golden" : "Mark Golden"}
        </button>
      </div>

      {match.status === "LIVE" && !needsTeams && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.04] p-2">
          <Badge variant="live"><Radio className="h-3 w-3" /> LIVE</Badge>
          <input value={lh} onChange={(e) => setLh(e.target.value)} type="number" min={0}
            className="h-8 w-10 rounded-lg border border-input bg-black/30 text-center text-sm font-bold focus-visible:outline-none" />
          <span className="text-muted-foreground">:</span>
          <input value={la} onChange={(e) => setLa(e.target.value)} type="number" min={0}
            className="h-8 w-10 rounded-lg border border-input bg-black/30 text-center text-sm font-bold focus-visible:outline-none" />
          <input value={min} onChange={(e) => setMin(e.target.value)} placeholder="67'"
            className="h-8 w-14 rounded-lg border border-input bg-black/30 px-2 text-center text-xs focus-visible:outline-none" />
          <button onClick={saveLive} disabled={pending}
            className="flex items-center gap-1 rounded-lg btn-gold px-2.5 py-1 text-xs font-semibold disabled:opacity-40">
            <Save className="h-3 w-3" /> Update
          </button>
          <button onClick={() => addGoal("HOME")} disabled={pending}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold hover:text-gold">
            <Goal className="h-3 w-3" /> Home
          </button>
          <button onClick={() => addGoal("AWAY")} disabled={pending}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold hover:text-gold">
            <Goal className="h-3 w-3" /> Away
          </button>
        </div>
      )}
    </div>
  );
}
