-- Allow tracking roles that exist only in the jobs cache (not yet in public.jobs).
-- Safe to run multiple times.
do $$
declare
  constraint_name text;
begin
  select tc.constraint_name into constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
    and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'applications'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'job_id'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.applications drop constraint %I',
      constraint_name
    );
  end if;
end $$;
