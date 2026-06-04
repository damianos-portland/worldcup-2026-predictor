// Live poller: every ~25s, sync in-progress matches into our DB (score + minute
// + goal/card ticker) and finalize them at full-time. Transport-agnostic — set
// SOFA_TRANSPORT=apify (recommended for production) or =direct (residential/local).
//   npm run worker:poll
import { prisma } from "../src/lib/prisma";
import { finalizeMatch } from "../src/lib/results";
import { pollMatches } from "./transport";

const INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || "25000", 10);
const TRANSPORT = process.env.SOFA_TRANSPORT || "direct";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tick() {
  const now = Date.now();
  // Only matches mapped to a source, not yet finished, within their live window.
  const candidates = await prisma.match.findMany({
    where: {
      sourceEventId: { not: null },
      status: { not: "FINISHED" },
      kickoff: { lte: new Date(now + 5 * 60_000), gte: new Date(now - 6 * 3_600_000) },
    },
    select: { id: true, sourceEventId: true, sourceUrl: true },
  });
  if (!candidates.length) return;

  const updates = await pollMatches(candidates);

  for (const u of updates) {
    if (u.finished && u.homeScore != null && u.awayScore != null) {
      console.log(`🏁  Finalizing ${u.matchId}: ${u.homeScore}-${u.awayScore}`);
      await finalizeMatch(u.matchId, u.homeScore, u.awayScore);
    } else if (u.inProgress) {
      await prisma.match.update({
        where: { id: u.matchId },
        data: {
          status: "LIVE",
          liveHomeScore: u.homeScore ?? 0,
          liveAwayScore: u.awayScore ?? 0,
          minute: u.minute,
          lastLiveUpdate: new Date(),
        },
      });
      for (const e of u.incidents) {
        await prisma.matchEvent.upsert({
          where: { matchId_sourceKey: { matchId: u.matchId, sourceKey: e.sourceKey } },
          update: { type: e.type as any, side: e.side as any, player: e.player, minute: e.minute },
          create: {
            matchId: u.matchId,
            sourceKey: e.sourceKey,
            type: e.type as any,
            side: e.side as any,
            player: e.player,
            minute: e.minute,
            sortKey: parseInt(e.minute || "0", 10) || 0,
          },
        });
      }
    }
  }
}

async function loop() {
  console.log(`📡  Live poller started (transport=${TRANSPORT}, every ${INTERVAL / 1000}s).`);
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
