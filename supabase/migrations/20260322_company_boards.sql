-- Dynamic ATS boards promoted by nightly discovery (service-role writes).
create table if not exists public.company_boards (
  provider text not null check (provider in ('greenhouse', 'lever', 'ashby')),
  board_token text not null,
  company_name text not null,
  careers_url text,
  status text not null check (status in ('active', 'empty', 'error')),
  design_jobs_found integer not null default 0,
  source text not null default 'discovered' check (source in ('discovered', 'seed')),
  last_probed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (provider, board_token)
);

create index if not exists company_boards_status_idx
  on public.company_boards (status);

alter table public.company_boards enable row level security;

-- Public read so the watchlist/UI can show discovered companies if needed.
-- Writes only via service role (cron / refresh).
drop policy if exists "company boards are publicly readable" on public.company_boards;
create policy "company boards are publicly readable"
  on public.company_boards for select
  using (true);
