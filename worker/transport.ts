// Live-data transport. Polls ESPN's open scoreboard API (no proxy, no Cloudflare)
// and returns a normalized per-match update. ESPN groups fixtures by UTC date, so
// we fetch the few dates our candidates fall on and match by ESPN event id.
import { fetchScoreboard, datesAround, type EspnEvent, type EspnIncident } from "./espn";

export type NormalizedIncident = EspnIncident;

export type MatchUpdate = {
  matchId: string;
  inProgress: boolean;
  finished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  minute: string | null;
  incidents: NormalizedIncident[];
};

type Candidate = { id: string; sourceEventId: string | null; kickoff: Date };

function toUpdate(matchId: string, ev: EspnEvent): MatchUpdate {
  return {
    matchId,
    inProgress: ev.state === "in",
    finished: ev.state === "post" && ev.completed,
    homeScore: ev.homeScore,
    awayScore: ev.awayScore,
    minute: ev.clock,
    incidents: ev.incidents,
  };
}

export async function pollMatches(matches: Candidate[]): Promise<MatchUpdate[]> {
  const mapped = matches.filter((m) => m.sourceEventId);
  if (!mapped.length) return [];

  // Collect the distinct UTC dates to query (kickoff ± 1 day), then one
  // scoreboard call per date covers every fixture on it.
  const dates = new Set<string>();
  for (const m of mapped) for (const d of datesAround(m.kickoff)) dates.add(d);

  const byEspnId = new Map<string, EspnEvent>();
  for (const date of dates) {
    const events = await fetchScoreboard(date).catch(() => [] as EspnEvent[]);
    for (const ev of events) byEspnId.set(ev.id, ev);
  }

  const out: MatchUpdate[] = [];
  for (const m of mapped) {
    const ev = byEspnId.get(m.sourceEventId!);
    if (ev) out.push(toUpdate(m.id, ev));
  }
  return out;
}
