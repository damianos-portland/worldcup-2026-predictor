// ESPN scoreboard client for the Live Center. ESPN's site API is open (no
// Cloudflare bot-wall, no proxy) and is the SAME source the schedule was seeded
// from, so team names line up. Works directly from any host (Render included).
//
//   GET .../sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD
//
// One call returns every fixture on that UTC date with live scores, status and a
// `details` array of goals/cards. We poll per-date (cheap) rather than per-match.

const BASE =
  process.env.ESPN_BASE ||
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type EspnIncident = {
  type: "GOAL" | "OWN_GOAL" | "PENALTY" | "YELLOW_CARD" | "RED_CARD";
  side: "HOME" | "AWAY";
  player: string | null;
  minute: string | null;
  sourceKey: string;
};

export type EspnEvent = {
  id: string;
  dateISO: string;
  homeId: string;
  homeName: string;
  awayId: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  state: "pre" | "in" | "post";
  completed: boolean;
  clock: string | null; // e.g. "67'", "HT", "FT"
  incidents: EspnIncident[];
};

const numOrNull = (v: any): number | null => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

// One ESPN scoring/discipline detail → our MatchEvent shape (goals + cards only).
function mapDetail(det: any, homeId: string, awayId: string): EspnIncident | null {
  const text = String(det?.type?.text ?? "").toLowerCase();
  const teamId = String(det?.team?.id ?? "");
  const side: "HOME" | "AWAY" = teamId === awayId && teamId !== homeId ? "AWAY" : "HOME";
  const minute = det?.clock?.displayValue ?? null;
  const player = det?.athletesInvolved?.[0]?.displayName ?? null;

  const isGoal = det?.scoringPlay === true || text.startsWith("goal") || det?.ownGoal === true;
  let type: EspnIncident["type"] | null = null;
  if (isGoal) {
    if (det?.ownGoal === true || text.includes("own goal")) type = "OWN_GOAL";
    else if (det?.penaltyKick === true || text.includes("penalt")) type = "PENALTY";
    else type = "GOAL";
  } else if (det?.redCard === true || text.includes("red card")) {
    type = "RED_CARD";
  } else if (det?.yellowCard === true || text.includes("yellow card")) {
    type = "YELLOW_CARD";
  } else {
    return null; // substitutions, VAR, missed penalties, etc.
  }

  return { type, side, player, minute, sourceKey: `${type}-${minute ?? ""}-${side}-${player ?? ""}` };
}

export function parseEvent(e: any): EspnEvent {
  const comp = e?.competitions?.[0] ?? {};
  const cs: any[] = comp.competitors ?? [];
  const home = cs.find((c) => c.homeAway === "home") ?? cs[0] ?? {};
  const away = cs.find((c) => c.homeAway === "away") ?? cs[1] ?? {};
  const t = e?.status?.type ?? {};
  const homeId = String(home?.team?.id ?? "");
  const awayId = String(away?.team?.id ?? "");

  const incidents: EspnIncident[] = [];
  for (const det of comp.details ?? []) {
    const inc = mapDetail(det, homeId, awayId);
    if (inc) incidents.push(inc);
  }

  return {
    id: String(e?.id ?? ""),
    dateISO: e?.date ?? "",
    homeId,
    homeName: home?.team?.displayName ?? "",
    awayId,
    awayName: away?.team?.displayName ?? "",
    homeScore: numOrNull(home?.score),
    awayScore: numOrNull(away?.score),
    state: (t?.state as EspnEvent["state"]) ?? "pre",
    completed: t?.completed === true,
    clock: e?.status?.displayClock ?? t?.shortDetail ?? t?.detail ?? null,
    incidents,
  };
}

/** Fetch every fixture on one UTC date, with gentle retry/backoff. */
export async function fetchScoreboard(yyyymmdd: string, attempt = 0): Promise<EspnEvent[]> {
  try {
    const res = await fetch(`${BASE}/scoreboard?dates=${yyyymmdd}`, { headers: HEADERS });
    if (!res.ok) {
      if (res.status >= 500 && attempt < 3) {
        await sleep(800 * (attempt + 1));
        return fetchScoreboard(yyyymmdd, attempt + 1);
      }
      throw new Error(`ESPN HTTP ${res.status} for ${yyyymmdd}`);
    }
    const data = await res.json();
    return (data?.events ?? []).map(parseEvent);
  } catch (e) {
    if (attempt < 3) {
      await sleep(800 * (attempt + 1));
      return fetchScoreboard(yyyymmdd, attempt + 1);
    }
    throw e;
  }
}

// ---- date helpers (all UTC) ------------------------------------------------

/** Date → "YYYYMMDD" in UTC, the format ESPN's `dates` query expects. */
export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** The kickoff's UTC date ± 1 day — covers fixtures ESPN lists under an
 *  adjacent calendar date (e.g. overnight US kickoffs). */
export function datesAround(kickoff: Date): string[] {
  return [-1, 0, 1].map((off) => ymd(new Date(kickoff.getTime() + off * 86_400_000)));
}

/** Every UTC date string from start..end inclusive. */
export function dateRange(start: Date, end: Date): string[] {
  const out: string[] = [];
  let t = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endT = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  for (; t <= endT; t += 86_400_000) out.push(ymd(new Date(t)));
  return out;
}
