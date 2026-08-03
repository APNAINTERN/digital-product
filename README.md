# SEO Vision AI

Complete Website SEO Audit & Business Growth Platform.

A modern SaaS application for analyzing any website URL and generating SEO scores, technical audits, traffic estimates, competitor benchmarks, and AI growth roadmaps.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts
- **Backend:** Node.js, Express, Prisma ORM, SQLite (swap to PostgreSQL via `DATABASE_URL`)
- **Auth:** JWT, email verification flow, optional Google OAuth
- **Analysis:** live HTML crawl + heuristic/AI report pipeline with clear **Verified / Estimated / AI-generated** labels

## Quick start

```bash
npm install
cp .env.example apps/api/.env
npm run db:push
npm run db:seed
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/health

### Demo accounts

| Role  | Email                 | Password   |
|-------|-----------------------|------------|
| User  | `demo@seovision.ai`   | `Demo123!` |
| Admin | `admin@seovision.ai`  | `Admin123!`|

## Deploy on Vercel (frontend)

`main` must contain this app (not only the old README). Use Root Directory **repository root** (uses `vercel.json`) **or** set Root Directory to `apps/web`.

1. In Vercel → Project → Settings → General:
   - **Framework Preset:** Vite
   - **Root Directory:** leave blank (repo root) *or* `apps/web`
   - **Build Command:** leave default from `vercel.json` / `npm run build`
   - **Output Directory:** `apps/web/dist` (repo root) or `dist` (if root is `apps/web`)
2. Production Branch: `main` (or the branch that contains the full app)
3. Add env var if your API is hosted elsewhere:
   - `VITE_API_URL` = `https://your-api-host` (no trailing slash)
4. Redeploy

SPA routes (`/login`, `/app`, …) are rewritten to `index.html` via `vercel.json` so deep links do not 404.

> The Express API (`apps/api`) is **not** a static Vercel site. Host it on Railway, Render, Fly.io, or similar, then set `VITE_API_URL` on Vercel. CORS already allows `CLIENT_URL`.

## Features

- Sign up / login / forgot password / email verification / profile
- Dashboard with website analyzer, recent reports, score rings, AI suggestions
- Full SEO report: technical, on-page, content, images, security, business info
- Estimated traffic, keywords, backlinks, competitors, local SEO, social signals
- AI growth advisor with 30/60/90-day action plans and one-click SEO fix suggestions
- Report history, favorites, compare, PDF/Excel/JSON export
- Billing plans (demo upgrade), API usage history, notifications
- Admin panel: users, reports, messages, feature flags, settings
- Dark / light / system theme

## Data transparency

Some metrics (exact visitor counts, owner identity, competitor traffic, etc.) cannot be known from a public crawl alone. The product labels:

- **Verified** – observed from crawl or connected APIs
- **Estimated** – modeled heuristics / third-party-style estimates
- **AI-generated** – strategic recommendations based on available inputs

Optional API keys in `.env` (`OPENAI_API_KEY`, `PAGESPEED_API_KEY`, `SERPAPI_KEY`, Google OAuth, etc.) enrich results when present; otherwise the platform falls back to deterministic estimates so demos work offline.

## Scripts

| Command        | Description                |
|----------------|----------------------------|
| `npm run dev`  | API + web concurrently     |
| `npm run build`| Build both apps            |
| `npm run db:push` | Sync Prisma schema      |
| `npm run db:seed` | Seed demo users/plans   |

## Monorepo layout

```
apps/api   Express API + Prisma + analysis engine
apps/web   React dashboard + landing + admin UI
```
