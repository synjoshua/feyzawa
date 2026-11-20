# Feyzawa setup guide

Joshua must create the external accounts and paste credentials into Vercel / `.env.local`. This agent cannot create your Supabase project or invent keys.

## 1. Supabase project

1. Go to [https://supabase.com](https://supabase.com) and create a project (e.g. `feyzawa`).
2. Open **Project Settings → API**.
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server only; never ship to the browser)
4. Open **SQL Editor**, paste and run the contents of [`supabase/schema.sql`](./supabase/schema.sql) (includes `applications`, `watchlist`, and `outreach`).
5. Auth URL config (**Authentication → URL configuration**):
   - **Site URL:** `https://feyzawa.vercel.app` (or your domain)
   - **Redirect URLs:**
     - `https://feyzawa.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`
6. **Multi-user sign-in (recommended): Google** — see below. You do **not** need a `@feyzawa.com` email.
7. Optional: keep Email magic link, but connect **custom SMTP** (Resend) so free Supabase mail rate limits don’t block friends.

### Auth approach

- Each person who signs in gets a real Supabase `auth.users` row → their own Profile + private applications / outreach (RLS).
- **Google OAuth** is the reliable path for sharing the app (no magic-link email quota).
- Email magic link works too once custom SMTP is set; Supabase’s built-in mailer is project-wide and too small for demos.
- Job listings are publicly readable (no private notes on jobs).

### Google sign-in (do this for real multi-user profiles)

1. Google Cloud Console → create/select a project → **APIs & Services → Credentials → Create OAuth client ID** (Web application).
2. Authorized JavaScript origins:
   - `https://feyzawa.vercel.app`
   - `http://localhost:3000`
3. Authorized redirect URIs (Supabase callback, not your app URL):
   - `https://hvblqufgpiewcxvbphkl.supabase.co/auth/v1/callback`
     (replace with your project ref if different)
4. Copy **Client ID** + **Client Secret**.
5. Supabase → **Authentication → Providers → Google** → enable → paste Client ID/Secret → Save.
6. On `/login`, users tap **Continue with Google** → land on `/profile`.

No Feyzawa-branded inbox required. Google accounts become Feyzawa profiles automatically.

### Magic link + Resend (optional)

Only if you still want email links without Google:

1. Create a free [Resend](https://resend.com) account.
2. Add/verify a sending domain **or** use Resend’s onboarding address while testing.
3. Supabase → **Project Settings → Authentication → SMTP**:
   - Host `smtp.resend.com`, port `465`, user `resend`, pass = Resend API key
   - Sender name `Feyzawa`, sender email = your verified Resend from-address
4. Then magic links can scale past the built-in rate limit.

You still don’t need a custom “Feyzawa email company” — just a verified From address on Resend.

## 2. Cron secret

1. Generate a long random string, e.g. `openssl rand -hex 32`.
2. Set `CRON_SECRET` in Vercel and `.env.local`.
3. Vercel Cron hits `GET /api/cron/refresh` once daily at 15:00 UTC (`vercel.json`). Hobby plans only allow daily crons; use in-app **Refresh jobs** for on-demand updates.
4. Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set in project env (ensure the secret matches).
5. Manual trigger:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://YOUR_DOMAIN/api/cron/refresh"
```

Without `CRON_SECRET`, refresh is allowed only in non-production (local).

## 3. Company allowlist + verifying board IDs

Built-in allowlist: `src/lib/ats/allowlist.ts`.

Each entry needs:

| Field | Meaning |
| --- | --- |
| `name` | Display name |
| `provider` | `greenhouse` \| `lever` \| `ashby` |
| `boardToken` | Public board slug/token |

### How to find board tokens

- **Greenhouse:** careers URL often looks like `boards.greenhouse.io/{token}` or the company slug used by `boards-api.greenhouse.io/v1/boards/{token}/jobs`.
- **Lever:** `jobs.lever.co/{token}` → `api.lever.co/v0/postings/{token}?mode=json`.
- **Ashby:** `jobs.ashbyhq.com/{token}` → `api.ashbyhq.com/posting-api/job-board/{token}`.

### Verify before adding

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://boards-api.greenhouse.io/v1/boards/figma/jobs"

curl -s -o /dev/null -w "%{http_code}\n" \
  "https://api.lever.co/v0/postings/palantir?mode=json"

curl -s -o /dev/null -w "%{http_code}\n" \
  "https://api.ashbyhq.com/posting-api/job-board/notion"
```

Expect `200`. `404` means the token is wrong or the board is private.

Optional override without code changes:

```bash
COMPANY_ALLOWLIST_JSON='[{"name":"Figma","provider":"greenhouse","boardToken":"figma"}]'
```

## 4. Local development

```bash
npm install
cp .env.example .env.local
# paste Supabase keys when ready
npm run refresh
npm run dev
```

`npm run refresh` writes real fetched jobs to `data/jobs-cache.json`. Browse works from that file even before Supabase is wired. Tracker / watchlist persistence requires Supabase Auth.

## 5. Vercel deploy

1. Import the Git repo into Vercel.
2. Set env vars from `.env.example`.
3. Deploy. Cron schedule is already in `vercel.json` (`0 15 * * *`, once daily — Hobby-compatible).
4. After first deploy, trigger `/api/cron/refresh` once so Supabase has jobs (service role required for upserts).

## 6. Graceful failure behavior

- Invalid board IDs → company failure logged; other companies continue.
- Rate limits / 5xx → retries with backoff, then skip that company and **preserve** its previous listings (do not mark closed).
- Successful fetch missing a prior listing → mark `potentially_closed`; application history remains (applications keep title/company/URL snapshots; `job_id` may null on delete).
- Missing Supabase → honest empty tracker messaging; job browse can still use file cache.

## 7. What you must create yourself

| Item | Who creates it |
| --- | --- |
| Supabase project + keys | You |
| Email auth / redirect URLs | You |
| `CRON_SECRET` | You |
| Vercel project + env | You |
| Extra company board tokens | You (verify with curl) |

The allowlist in-repo was verified against live public endpoints during V1 build; tokens can still change — re-verify if a company starts failing.
