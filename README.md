# Bunch

Personal UX / Product Design job board for early-career roles.

Real listings from public **Greenhouse**, **Lever**, and **Ashby** job-board APIs (no paid API keys). Private application tracking via **Supabase**. Scheduled refresh every 12 hours on **Vercel Cron**.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase Auth (magic link) + Postgres (RLS)
- Vercel deploy + Cron

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill Supabase keys once you create a project (see docs below)
npm run refresh   # fetch real jobs into data/jobs-cache.json
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Setup (credentials you must create)

Full walkthrough: see [`docs` in the Project store](./SETUP.md) or the Project doc `setup.md`.

You need to create:

1. A **Supabase** project (URL, anon key, service role key)
2. Run `supabase/schema.sql` in the SQL editor
3. A **CRON_SECRET** for securing `/api/cron/refresh`
4. Deploy to **Vercel** with those env vars

This repo cannot invent your Supabase project for you.

## Company allowlist

Edit `src/lib/ats/allowlist.ts` or set `COMPANY_ALLOWLIST_JSON`.

Verify a board ID:

```bash
# Greenhouse
curl -sI "https://boards-api.greenhouse.io/v1/boards/BOARD_TOKEN/jobs"

# Lever
curl -sI "https://api.lever.co/v0/postings/BOARD_TOKEN?mode=json"

# Ashby
curl -sI "https://api.ashbyhq.com/posting-api/job-board/BOARD_TOKEN"
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run refresh` | Server-side fetch + normalize + write cache |
| `npm run dev` | Local app |
| `npm run build` | Production build |

## License

Private personal project.
