# ⚡ Live Score Worker (Sofascore)

A standalone Node worker that keeps the Live Center fed: it maps our fixtures to
Sofascore events, then polls live scores + goals/cards and finalizes matches at
full-time (which triggers the standings recalc). Runs **separately** from the
Next.js app (Vercel can't host a 30-second poller).

## Scripts
```bash
npm run worker:map    # one-off: link our fixtures to Sofascore event IDs
npm run worker:poll   # long-running: poll live scores every ~25s
```

## ⚠️ Cloudflare / anti-bot — read this first
Sofascore sits behind Cloudflare and **blocks datacenter IPs** (Render, Railway,
most VPSes). We verified this: a raw Node fetch from a server returns **HTTP 403**
on every endpoint. So in production you must use ONE of these transports:

### Option A — Residential proxy (simplest, keeps this worker as-is)
Set `SOFA_PROXY_URL` to a **residential** proxy and the worker routes through it.
With Apify's residential proxy:
```
SOFA_PROXY_URL=http://groups-RESIDENTIAL:<APIFY_PROXY_PASSWORD>@proxy.apify.com:8000
```
(Any residential proxy provider works. Plain datacenter proxies will still be blocked.)

### Option B — Apify Sofascore actor (most robust, free, maintained)
The free **`azzouzana/sofascore-scraper-pro`** actor scrapes Sofascore (handling
Cloudflare itself) and returns the same `event` + `incidents` data. Run it on an
Apify schedule, or call it from the worker with your `APIFY_TOKEN`. Use this if a
residential proxy still gets challenged. (Wiring this transport in is a small
follow-up — ask and it can be added behind a `SOFA_TRANSPORT=apify` switch.)

> Local dev / residential home IPs are **not** blocked, so `worker:map` and
> `worker:poll` work directly from your machine for testing.

## Environment variables
| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | **Required.** Same Neon DB as the app. |
| `POLL_INTERVAL_MS` | `25000` | Poll cadence in ms. |
| `SOFA_PROXY_URL` | — | Residential proxy (see Option A). |
| `WC_TOURNAMENT_ID` | `16` | Sofascore FIFA World Cup id. |
| `WC_SEASON_ID` | `58210` | Sofascore 2026 season id. |

## Deploy on Render (background worker)
1. New → **Background Worker**, point at this repo.
2. Build: `npm install` · Start: `npm run worker:poll`
3. Env: `DATABASE_URL` (Neon) + `SOFA_PROXY_URL` (residential).
4. Run `npm run worker:map` once at tournament start (Render Shell or locally
   against Neon), and again after each knockout draw fills in teams.

(Railway / a VPS work the same — any always-on Node process.)

## How it works
- **map-fixtures** pulls the WC 2026 fixtures from Sofascore and matches them to
  our fixtures by team name (with aliases in `normalize.ts`), writing
  `Match.sourceEventId`.
- **poll** hits `events/live` once per cycle, and for each mapped match that is
  in progress it updates `liveHomeScore/liveAwayScore/minute` (status → `LIVE`)
  and upserts goal/card events. When a live match leaves the feed and Sofascore
  reports it finished, it calls the shared `finalizeMatch()` (sets the official
  score, advances the bracket, recalculates every league).
- It only ever **writes live + result fields** — predictions, leagues and users
  are never touched.
