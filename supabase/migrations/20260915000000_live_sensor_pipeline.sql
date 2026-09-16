do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'readings'
  ) then
    alter publication supabase_realtime add table public.readings;
  end if;
end;
$$;

create index if not exists readings_device_stage_created_at_idx
  on public.readings (device_id, stage, created_at desc);