# ⚡ Live Score Worker (ESPN)

A standalone Node worker that keeps the Live Center fed: it maps our fixtures to
ESPN events, then polls live scores + goals/cards and finalizes matches at
full-time (which triggers the standings recalc). Runs **separately** from the
Next.js app (Vercel can't host a 30-second poller).

## Scripts
```bash
npm run worker:map    # one-off: link our fixtures to ESPN event IDs
npm run worker:poll   # long-running: poll live scores every ~25s
```

## Why ESPN
Live data comes from **ESPN's open scoreboard API** — the same source the
schedule was seeded from, so team names line up:

```
GET https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD
```

It's a public JSON API with **no Cloudflare bot-wall and no proxy required**, so
the worker runs directly from any host (Render, Railway, a VPS, or your laptop).
One call returns every fixture on a UTC date with live scores, status, and a
`details` array of goals/cards — so we poll **per-date** (cheap), not per-match.

## Environment variables
| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | **Required.** Same Neon DB as the app. |
| `POLL_INTERVAL_MS` | `25000` | Poll cadence in ms. |
| `ESPN_BASE` | ESPN fifa.world endpoint | Override only if ESPN moves the path. |

That's it — no tokens, no proxies.

## Deploy on Render (background worker)
1. New → **Blueprint** (or **Background Worker**), point at this repo. The repo's
   `render.yaml` defines the `wc-live-poller` worker.
2. Build: `npm install` · Start: `npm run worker:poll`
3. Env: set `DATABASE_URL` (Neon) in the dashboard.
4. Run `npm run worker:map` once at tournament start (Render Shell or locally
   against Neon), and again after each knockout draw fills in teams.

(Railway / a VPS work the same — any always-on Node process.)

## How it works
- **map-fixtures** sweeps every UTC date the tournament spans, pulls ESPN's
  fixtures, and matches them to our fixtures by team name (order-insensitive, with
  aliases in `normalize.ts`), writing `Match.sourceEventId` (the ESPN event id).
- **poll** gathers in-window mapped matches, fetches the scoreboard for the few
  dates they fall on, and for each match in progress updates
  `liveHomeScore/liveAwayScore/minute` (status → `LIVE`) and upserts goal/card
  events. When ESPN reports a match `post`/completed, it calls the shared
  `finalizeMatch()` (sets the official score, advances the bracket, recalculates
  every league).
- It only ever **writes live + result fields** — predictions, leagues and users
  are never touched.
