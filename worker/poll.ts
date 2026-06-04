// Live poller: every ~25s, sync in-progress matches from Sofascore into our DB
// (score + minute + goal/card ticker) and finalize matches at full-time.
//   npm run worker:poll
import { prisma } from "../src/lib/prisma";
import { finalizeMatch } from "../src/lib/results";
import { getLiveEvents, getEvent, getIncidents } from "./sofascore";

const INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || "25000", 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mapIncident(inc: any): { type: string; side: string; player: string | null; minute: string | null } | null {
  const side = inc.isHome ? "HOME" : "AWAY";
  const minute = inc.time != null ? `${inc.time}'` : null;
  const player = inc.player?.name ?? null;
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

async function syncIncidents(matchId: string, eventId: string) {
  let incidents: any[] = [];
  try {
    incidents = await getIncidents(eventId);
  } catch {
    return;
  }
  let order = 0;
  for (const inc of incidents) {
    order++;
    const mapped = mapIncident(inc);
    if (!mapped) continue;
    const sourceKey = `${inc.incidentType}-${inc.time ?? ""}-${inc.isHome ? "H" : "A"}-${mapped.player ?? mapped.type}`;
    await prisma.matchEvent.upsert({
      where: { matchId_sourceKey: { matchId, sourceKey } },
      update: { type: mapped.type as any, side: mapped.side as any, player: mapped.player, minute: mapped.minute },
      create: {
        matchId,
        sourceKey,
        type: mapped.type as any,
        side: mapped.side as any,
        player: mapped.player,
        minute: mapped.minute,
        sortKey: inc.time ?? order,
      },
    });
  }
}

async function tick() {
  const live = await getLiveEvents();
  const liveById = new Map(live.map((e) => [String(e.id), e]));

  const matches = await prisma.match.findMany({
    where: { sourceEventId: { not: null }, status: { not: "FINISHED" } },
  });

  for (const m of matches) {
    const ev = m.sourceEventId ? liveById.get(m.sourceEventId) : undefined;

    if (ev && ev.statusType === "inprogress") {
      await prisma.match.update({
        where: { id: m.id },
        data: {
          status: "LIVE",
          liveHomeScore: ev.homeScore ?? 0,
          liveAwayScore: ev.awayScore ?? 0,
          minute: ev.statusDesc ?? null,
          lastLiveUpdate: new Date(),
        },
      });
      await syncIncidents(m.id, m.sourceEventId!);
    } else if (m.status === "LIVE") {
      // Was live, no longer in the live feed → check if it finished.
      const detail = await getEvent(m.sourceEventId!).catch(() => null);
      if (detail && detail.statusType === "finished" && detail.homeScore != null && detail.awayScore != null) {
        console.log(`🏁  Finalizing ${m.id}: ${detail.home} ${detail.homeScore}-${detail.awayScore} ${detail.away}`);
        await finalizeMatch(m.id, detail.homeScore, detail.awayScore);
      }
    }
  }
}

async function loop() {
  console.log(`📡  Live poller started (every ${INTERVAL / 1000}s). Watching mapped fixtures…`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await tick();
    } catch (e) {
      console.error("poll error:", (e as Error).message);
    }
    await sleep(INTERVAL);
  }
}

loop();
