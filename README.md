# 🏆 World Cup 2026 Predictor League

A premium, production-ready fantasy prediction platform for the FIFA World Cup 2026.
Predict every match, compete in unlimited private leagues, earn bonuses with Jokers,
Golden Matches and streaks, and climb an animated leaderboard.

Built entirely with **free & open-source** technology — no paid APIs, no vendor lock-in.

## ✨ Features

- **Unlimited private leagues** — join with an `XXXXX-XXXXX` invite code
- **Two phases** — Group Stage + Knockouts with cumulative scoring
- **Smart scoring engine** — 10 pts exact, 3 pts outcome, with:
  - **Golden Matches** (×2) marked by the admin
  - **Jokers** (×2) — one per phase
  - **Streak bonuses** — +5 for 3-in-a-row, +15 for 5-in-a-row
  - **Tournament Winner** (+30) and **Top Scorer** (+25) bonuses
  - One-time **replacement** for an eliminated Winner / Top Scorer pick
- **Animated leaderboard** with a top-3 podium and movement indicators (▲ ▼ ▬)
- **Player profiles** with a full points breakdown and accuracy %
- **Comparison tool** — head-to-head predictions
- **Achievements** — 10 unlockable badges
- **Tournament bracket** view
- **Admin dashboard** — Match Center, results entry with automatic recalculation,
  team elimination, top-scorer selection, phase control, league/code generation
- **Hall of Fame**, notifications, countdown widgets
- Premium **dark + gold** theme, glassmorphism, mobile-first responsive design

## 🧱 Tech Stack

Next.js 14 (App Router) · React · TypeScript · TailwindCSS · shadcn-style UI ·
Lucide Icons · Prisma ORM · PostgreSQL · NextAuth (Credentials) · Docker

## 🚀 Quick start (Docker — one command)

```bash
docker-compose up --build
```

This boots PostgreSQL, pushes the schema, seeds the World Cup 2026 data
(48 teams, 72 group matches, full knockout bracket + an admin account) and starts the app.

Open **http://localhost:3000**

## 💻 Local development (without Docker)

Requires Node 20+ and a running PostgreSQL instance.

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env   # then edit DATABASE_URL / NEXTAUTH_SECRET

# 3. Push schema + seed
npm run db:push
npm run db:seed

# 4. Run
npm run dev
```

You can also start just the database with Docker:

```bash
docker-compose up db -d
```

## 🗄️ Useful scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:seed` | Sync teams, fixtures & admin **non-destructively** — safe to re-run, keeps predictions/results/leagues |
| `npm run db:reset` | **Wipe everything** and re-seed from scratch (destroys predictions) |
| `npm run db:studio` | Open Prisma Studio |

## 🎮 How it works

1. **Admin** creates a league → shares the generated code.
2. **Members** register, join with the code, pick a team name.
3. Everyone predicts every group-stage scoreline + a Tournament Winner + Top Scorer.
4. **Admin** enters official results in the Match Center → standings, stats and
   achievements recalculate automatically for every league.
5. Admin locks the group stage and opens the **Knockout** phase.
6. Cumulative scoring continues through the Final. The champion enters the **Hall of Fame**.

## 📦 Deployment

The app emits a standalone build (`output: "standalone"`) and ships with a `Dockerfile`
+ `docker-compose.yml`. Deploy free on Vercel, Render, Railway, Coolify or any VPS —
just provide `DATABASE_URL` and `NEXTAUTH_SECRET` env vars.

## 📐 Data model

`User · League · Membership (Team) · NationalTeam · Player · Match · Prediction ·
TournamentWinnerPick · TopScorerPick · Achievement · Notification · HallOfFame · AdminSettings`

See `prisma/schema.prisma` for the full schema.
