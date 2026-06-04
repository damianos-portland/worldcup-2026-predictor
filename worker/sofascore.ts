// Minimal Sofascore (unofficial) API client with browser-like headers,
// gentle retry/backoff. Endpoints validated in the feasibility spike.
//
// IMPORTANT: Sofascore is behind Cloudflare and blocks datacenter IPs (Render/
// Railway). Set SOFA_PROXY_URL to a RESIDENTIAL proxy to get through, e.g. an
// Apify residential proxy:
//   SOFA_PROXY_URL=http://groups-RESIDENTIAL:<APIFY_PROXY_PASSWORD>@proxy.apify.com:8000
// Without a proxy the client works from residential IPs / local dev only.
import { ProxyAgent } from "undici";

const BASE = process.env.SOFASCORE_BASE || "https://api.sofascore.com/api/v1";
const PROXY_URL = process.env.SOFA_PROXY_URL;
const dispatcher = PROXY_URL ? new ProxyAgent(PROXY_URL) : undefined;

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.sofascore.com/",
  Origin: "https://www.sofascore.com",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(path: string, attempt = 0): Promise<any> {
  try {
    const res = await fetch(BASE + path, { headers: HEADERS, dispatcher } as any);
    if (res.status === 403 || res.status === 429 || res.status >= 500) {
      if (attempt < 3) {
        await sleep(1000 * (attempt + 1));
        return fetchJson(path, attempt + 1);
      }
      throw new Error(`HTTP ${res.status} for ${path}`);
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.json();
  } catch (e) {
    if (attempt < 3) {
      await sleep(1000 * (attempt + 1));
      return fetchJson(path, attempt + 1);
    }
    throw e;
  }
}

export type SofaEvent = {
  id: number;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  statusType: string | null; // notstarted | inprogress | finished | canceled
  statusDesc: string | null; // "1st half", "Halftime", "Ended" ...
  startTimestamp: number | null;
};

function mapEvent(e: any): SofaEvent {
  return {
    id: e.id,
    home: e.homeTeam?.name ?? "",
    away: e.awayTeam?.name ?? "",
    homeScore: e.homeScore?.current ?? null,
    awayScore: e.awayScore?.current ?? null,
    statusType: e.status?.type ?? null,
    statusDesc: e.status?.description ?? null,
    startTimestamp: e.startTimestamp ?? null,
  };
}

export async function getLiveEvents(): Promise<SofaEvent[]> {
  const data = await fetchJson("/sport/football/events/live");
  return (data?.events ?? []).map(mapEvent);
}

export async function getEvent(eventId: string): Promise<SofaEvent | null> {
  const data = await fetchJson(`/event/${eventId}`);
  return data?.event ? mapEvent(data.event) : null;
}

export async function getSeasonFixtures(
  tournamentId: number,
  seasonId: number
): Promise<SofaEvent[]> {
  const all: SofaEvent[] = [];
  for (const kind of ["last", "next"]) {
    for (let page = 0; page < 12; page++) {
      const d = await fetchJson(
        `/unique-tournament/${tournamentId}/season/${seasonId}/events/${kind}/${page}`
      );
      if (!d?.events?.length) break;
      all.push(...d.events.map(mapEvent));
      if (!d.hasNextPage) break;
      await sleep(300);
    }
  }
  return all;
}

export async function getIncidents(eventId: string): Promise<any[]> {
  const data = await fetchJson(`/event/${eventId}/incidents`);
  return data?.incidents ?? [];
}
