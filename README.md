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
docker compose up -d   # local Postgres
npm install
cp .env.example apps/api/.env
npm run db:push
npm run db:seed
npm run dev
```

> SQLite is no longer used — Postgres is required (local Docker or Neon) so the same code can run on Vercel.

- Web: http://localhost:5173
- API: http://localhost:4000/api/health

### Demo accounts

| Role  | Email                 | Password   |
|-------|-----------------------|------------|
| User  | `demo@seovision.ai`   | `Demo123!` |
| Admin | `admin@seovision.ai`  | `Admin123!`|

## Deploy on Vercel (frontend + API)

The login **405** error happens when `POST /api/auth/login` is rewritten to a static page. This repo now deploys the Express API as a Vercel serverless function on the **same project**.

### 1. Create a free Postgres database (required)

Vercel cannot use local SQLite. Create a free DB on [Neon](https://neon.tech) (or Supabase), then copy the connection string.

### 2. Vercel project settings

- **Root Directory:** repository root (leave blank)
- **Production Branch:** `main`
- Framework can stay Vite (`vercel.json` controls build)

### 3. Environment variables (Vercel → Settings → Environment Variables)

| Name | Example |
|------|---------|
| `DATABASE_URL` | `postgresql://...@...neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | long random string |
| `CLIENT_URL` | `https://your-app.vercel.app` |
| `API_URL` | `https://your-app.vercel.app` |

Do **not** set `VITE_API_URL` when API and web are on the same Vercel domain (default `/api` works).

### 4. Redeploy

After the first successful deploy, open `/api/health`. Demo users are auto-seeded when the DB is empty:

- `demo@seovision.ai` / `Demo123!`
- `admin@seovision.ai` / `Admin123!`

### Local Postgres

```bash
docker compose up -d
cp .env.example apps/api/.env
npm run db:push && npm run db:seed
npm run dev
```

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
