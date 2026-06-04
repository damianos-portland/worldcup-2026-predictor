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

### Option B — Apify Sofascore actor (recommended for production) ✅ built-in
The free **`azzouzana/sofascore-scraper-pro`** actor scrapes Sofascore (handling
Cloudflare itself) and returns the same `event` + `incidents` data. It's wired in:
set these and the poller routes every request through Apify:
```
SOFA_TRANSPORT=apify
APIFY_TOKEN=<your Apify API token>
```
This works from any datacenter host (Render/Railway). Each poll cycle is a single
synchronous actor run covering all in-progress matches at once.

> Local dev / residential home IPs are **not** blocked, so `worker:map` and
> `worker:poll` work directly from your machine for testing.

## Environment variables
| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | **Required.** Same Neon DB as the app. |
| `POLL_INTERVAL_MS` | `25000` | Poll cadence in ms. |
| `SOFA_TRANSPORT` | `direct` | `apify` (recommended prod) or `direct`. |
| `APIFY_TOKEN` | — | Required when `SOFA_TRANSPORT=apify`. |
| `SOFA_ACTOR` | `azzouzana~sofascore-scraper-pro` | Apify actor to use. |
| `SOFA_PROXY_URL` | — | Residential proxy for `direct` mode (Option A). |
| `WC_TOURNAMENT_ID` | `16` | Sofascore FIFA World Cup id. |
| `WC_SEASON_ID` | `58210` | Sofascore 2026 season id. |

> **Mapping note:** `worker:map` uses the *direct* client (Sofascore's season
> fixtures endpoint), so run it from a residential IP (your Mac) or with
> `SOFA_PROXY_URL` set. The always-on `worker:poll` then runs with
> `SOFA_TRANSPORT=apify` on your server.

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
