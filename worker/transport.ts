// Pluggable live-data transport. SOFA_TRANSPORT=direct (raw Sofascore — works
// from residential/local IPs) or =apify (via the Apify actor — works anywhere,
// recommended for production). Both return the same normalized shape.
import { getEvent, getIncidents } from "./sofascore";
import { scrapeMatchUrls } from "./apify";

const TRANSPORT = process.env.SOFA_TRANSPORT || "direct";

export type NormalizedIncident = {
  type: string;
  side: string;
  player: string | null;
  minute: string | null;
  sourceKey: string;
};

export type MatchUpdate = {
  matchId: string;
  inProgress: boolean;
  finished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  minute: string | null;
  incidents: NormalizedIncident[];
};

// Sofascore incident → our MatchEvent (goals + cards only).
function mapIncident(inc: any): { type: string; side: string; player: string | null; minute: string | null } | null {
  const side = inc.isHome ? "HOME" : "AWAY";
  const minute = inc.time != null ? `${inc.time}'` : null;
  const player = inc.player?.name ?? inc.playerName ?? null;
  if (inc.incidentType === "goal") {
    let type = "GOAL";
    if (inc.incidentClass === "ownGoal") type = "OWN_GOAL";
    else if (inc.incidentClass === "penalty") type = "PENALTY";
    return { type, side, player, minute };
  }
  if (inc.incidentType === "card") {
    const type = inc.incidentClass === "red" || inc.incidentClass === "yellowRed" ? "RED_CARD" : "YELLOW_CARD";
    return { type, side, player, minute };
  }
  return null;
}

function sourceKeyFor(inc: any): string {
  const who = inc.player?.name ?? inc.playerName ?? "";
  return `${inc.incidentType}-${inc.time ?? ""}-${inc.isHome ? "H" : "A"}-${who}`;
}

// Works for both the raw actor event ({status:{type}, homeScore:{current}}) and
// the direct client's already-mapped SofaEvent ({statusType, homeScore}).
function normalize(matchId: string, event: any, incidents: any[]): MatchUpdate {
  const statusType = event?.status?.type ?? event?.statusType ?? null;
  const homeScore = event?.homeScore?.current ?? event?.homeScore ?? null;
  const awayScore = event?.awayScore?.current ?? event?.awayScore ?? null;
  const minute = event?.status?.description ?? event?.statusDesc ?? null;

  const mapped: NormalizedIncident[] = [];
  for (const inc of incidents ?? []) {
    const m = mapIncident(inc);
    if (m) mapped.push({ ...m, sourceKey: sourceKeyFor(inc) });
  }

  return {
    matchId,
    inProgress: statusType === "inprogress",
    finished: statusType === "finished",
    homeScore: typeof homeScore === "number" ? homeScore : null,
    awayScore: typeof awayScore === "number" ? awayScore : null,
    minute,
    incidents: mapped,
  };
}

type Candidate = { id: string; sourceEventId: string | null; sourceUrl: string | null };

export async function pollMatches(matches: Candidate[]): Promise<MatchUpdate[]> {
  if (TRANSPORT === "apify") {
    const urls = matches.map((m) => m.sourceUrl).filter((u): u is string => !!u);
    const items = await scrapeMatchUrls(urls);
    const byId = new Map<string, any>();
    for (const it of items) {
      const ev = it?.data?.event;
      if (ev?.id != null) byId.set(String(ev.id), it.data);
    }
    const out: MatchUpdate[] = [];
    for (const m of matches) {
      const d = m.sourceEventId ? byId.get(m.sourceEventId) : undefined;
      if (d) out.push(normalize(m.id, d.event, d.incidents ?? []));
    }
    return out;
  }

  // direct (residential / local only)
  const out: MatchUpdate[] = [];
  for (const m of matches) {
    if (!m.sourceEventId) continue;
    const ev = await getEvent(m.sourceEventId).catch(() => null);
    if (!ev) continue;
    const inc = ev.statusType === "inprogress" ? await getIncidents(m.sourceEventId).catch(() => []) : [];
    out.push(normalize(m.id, ev, inc));
  }
  return out;
}
