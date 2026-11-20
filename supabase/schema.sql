-- Feyzawa V1 schema — run in the Supabase SQL editor for your project.
-- Private by default: RLS enabled; users only see their own rows.

-- ---------------------------------------------------------------------------
-- Jobs (public read for authenticated + anon browse; writes via service role)
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id text primary key,
  company_name text not null,
  provider text not null check (provider in ('greenhouse', 'lever', 'ashby')),
  board_token text not null,
  source_id text not null,
  title text not null,
  apply_url text not null,
  location_text text default '',
  description_text text default '',
  experience_band text not null,
  work_style text not null,
  city text,
  state_region text,
  country_code text,
  is_california boolean default false,
  is_remote boolean default false,
  is_internship boolean default false,
  is_full_time boolean default true,
  eligibility text not null check (eligibility in ('possible', 'unclear')),
  eligibility_reasons text[] default '{}',
  early_career_score integer default 0,
  posted_at timestamptz,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  last_verified_at timestamptz not null,
  status text not null check (status in ('active', 'potentially_closed')),
  updated_at timestamptz not null default now(),
  unique (provider, board_token, source_id)
);

create index if not exists jobs_company_idx on public.jobs (company_name);
create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_eligibility_idx on public.jobs (eligibility);
create index if not exists jobs_last_seen_idx on public.jobs (last_seen_at desc);

alter table public.jobs enable row level security;

-- Anyone can read job listings (no private notes here).
drop policy if exists "jobs are publicly readable" on public.jobs;
create policy "jobs are publicly readable"
  on public.jobs for select
  using (true);

-- Writes only via service role (cron / refresh). No insert/update/delete for anon/authenticated.

-- ---------------------------------------------------------------------------
-- Applications (private per user)
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- No FK to jobs: board listings often live in cache before/without a jobs row.
  job_id text,
  title_snapshot text not null,
  company_snapshot text not null,
  apply_url text,
  location_snapshot text,
  status text not null check (status in ('saved', 'not_interested', 'applied', 'interviewing', 'offer', 'rejected')),
  notes text default '',
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_idx on public.applications (user_id);
create index if not exists applications_status_idx on public.applications (user_id, status);

alter table public.applications enable row level security;

drop policy if exists "users read own applications" on public.applications;
create policy "users read own applications"
  on public.applications for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own applications" on public.applications;
create policy "users insert own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own applications" on public.applications;
create policy "users update own applications"
  on public.applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own applications" on public.applications;
create policy "users delete own applications"
  on public.applications for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Company watchlist (private per user)
-- ---------------------------------------------------------------------------
create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null,
  provider text,
  board_token text,
  created_at timestamptz not null default now(),
  unique (user_id, company_name)
);

alter table public.watchlist enable row level security;

drop policy if exists "users manage own watchlist" on public.watchlist;
create policy "users manage own watchlist"
  on public.watchlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Outreach queue (private per user) — LinkedIn URLs are user-supplied only
-- ---------------------------------------------------------------------------
create table if not exists public.outreach (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null,
  recruiter_id text,
  recruiter_name text not null,
  linkedin_url text default '',
  role_title text default '',
  job_id text,
  status text not null check (status in ('queued', 'drafted', 'sent', 'connected', 'replied', 'closed')),
  draft_message text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_user_idx on public.outreach (user_id);

alter table public.outreach enable row level security;

drop policy if exists "users manage own outreach" on public.outreach;
create policy "users manage own outreach"
  on public.outreach for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Optional: allowlist only one email (set after you create your account)
-- Uncomment and replace with Joshua's email to lock the app to a single user.
-- ---------------------------------------------------------------------------
-- create or replace function public.is_allowed_user()
-- returns boolean
-- language sql
-- stable
-- as $$
--   select coalesce(
--     (auth.jwt() ->> 'email') = 'YOUR_EMAIL@example.com',
--     false
--   );
-- $$;
--
-- Then add `and public.is_allowed_user()` to application/watchlist policies.
