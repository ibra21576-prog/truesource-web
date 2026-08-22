# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TrueSource Flip ("Deal Monitor für Vinted, eBay & Kleinanzeigen") — a Next.js 14 (App Router) web app that watches saved searches across multiple secondhand-marketplace platforms and surfaces new listings, with an AI-powered listing generator and a monthly credit system (Whop for payments/auth). Supabase is the backend (Postgres + auth via `@supabase/ssr`). Deployed on Vercel at `truesource-web-pink.vercel.app`, connected to this GitHub repo (`ibra21576-prog/truesource-web`) for auto-deploy on push to `master`.

## Commands

```
npm install
npm run dev      # next dev
npm run build     # next build
npm run start     # next start -p ${PORT:-3000}
npm run lint      # next lint
```

No automated test suite exists. `.env.local.example` lists the required environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) — copy to `.env.local` for local dev. Real env files (`.env.local`, `.env.prod`, `.env.production`, `.env.vercel`) are gitignored; never commit real Supabase/Whop credentials.

## Architecture

**Scraper layer** (`lib/scraper/`): one file per marketplace (`vinted.ts`, `ebay.ts`, `kleinanzeigen.ts`, `gumtree.ts`, `kijiji.ts`, `craigslist.ts`, `shpock.ts`, `marktplaats.ts`, `leboncoin.ts`), each exporting a `fetch<Platform>(search)` implementing a shared `ScrapedItem`/`Search` shape (`lib/scraper/types.ts`). `lib/scraper/index.ts`'s `fetchItems()` dispatches by `search.platform` and applies shared post-filtering (`matchesProduct`, `isWantedAd` from `lib/scraper/utils.ts`) so per-platform scrapers only need to return raw results. Add a new platform by adding one file here plus a case in the `index.ts` switch.

**Scrape scheduling has two independent trigger paths for the same cycle** (`lib/scheduler.ts`'s `runScrapeCycle()`):
1. `app/api/cron/route.ts` — an HTTP-triggered path, auth'd via `CRON_SECRET` (as either a Bearer header or a `?key=` query param — the query-param form exists specifically so a free external pinger needs no header config). `.github/workflows/scrape.yml` is the actual scheduler in production: GitHub Actions runs every 5 minutes and loops with a 60s sleep to ping `/api/cron` roughly once a minute (GitHub Actions' minimum schedule granularity is 5 minutes, so this loop is how ~1-minute coverage is achieved on a serverless host). This only works because the repo is public (unlimited free Actions minutes).
2. An internal always-on-host scheduler path in the same file, for if this ever runs on Railway/Render/Fly/a VPS instead of Vercel serverless — not currently used in production.

One cycle dedupes work by `(platform|query|domain)` — many users' identical saved searches collapse into a single scrape — processes oldest-scraped searches first for fair rotation, and stops launching new scrapes once its time budget is hit rather than blocking, leaving the rest for the next tick.

**Supabase access is split by privilege**: `lib/supabase/client.ts` (browser, anon key, RLS-scoped) vs `lib/supabase/server.ts` (`createServiceClient()`, service-role key, used by the cron/scheduler path which needs to read/write across all users' searches). Schema lives in `supabase/schema.sql`. Never use the service-role client from user-facing request handlers.

**Routes** (`app/`): `dashboard`, `searches`, `archive`, `settings`, `create-listing`, `login`, `token` are the user-facing pages; `app/api/*` covers auth, credits, the cron trigger, the feed, image proxying (`api/img`), the AI listing generator (`api/listing`), Vinted account connection, and a couple of admin/debug/migration endpoints — check an endpoint's own file before assuming its behavior, several are one-off/debug routes rather than part of the main product flow.

**Payments/credits**: `@whop-apps/sdk` handles the paid layer; the credit system refreshes monthly (see recent git history) rather than being a one-time grant — check `app/api/credits/route.ts` for current logic before changing pricing/limits.

## Deploy

This repo is Git-connected to Vercel (`.vercel/repo.json` — do not commit real `.vercel/project.json` if it ever appears, it's meant to stay local). Pushing to `master` triggers a production deploy automatically. `vercel.json` sets `X-Frame-Options`/CSP headers permissive enough to allow iframe embedding, and declares a Vercel Cron (`/api/cron` daily at 08:00) as a second, coarser trigger alongside the GitHub Actions minute-level pinger above.
