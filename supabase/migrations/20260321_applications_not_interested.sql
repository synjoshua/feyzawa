-- Allow applications.status = 'not_interested' (dismissed roles).
do $$
declare
  c_name text;
begin
  select con.conname into c_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'applications'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%';
  limit 1;

  if c_name is not null then
    execute format('alter table public.applications drop constraint %I', c_name);
  end if;

  alter table public.applications
    add constraint applications_status_check
    check (status in ('saved', 'not_interested', 'applied', 'interviewing', 'offer', 'rejected'));
end $$;
