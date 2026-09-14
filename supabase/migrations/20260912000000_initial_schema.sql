create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  device_number text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create table public.devices (
  id text primary key,
  owner_id uuid references public.profiles(id) on delete set null,
  api_key text not null,
  location text,
  last_seen timestamptz
);

create table public.readings (
  id bigint generated always as identity primary key,
  device_id text references public.devices(id) on delete cascade,
  stage text not null check (stage in ('pre', 'post')),
  sensor_values jsonb not null,
  source text not null default 'live' check (source in ('live', 'sample_upload')),
  created_at timestamptz not null default now()
);

create table public.alerts (
  id bigint generated always as identity primary key,
  device_id text references public.devices(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  message text not null,
  severity text not null default 'warning',
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.model_versions (
  id bigint generated always as identity primary key,
  stage text not null check (stage in ('pre', 'post')),
  mode text not null check (mode in ('dummy', 'sensor')),
  algorithm text not null,
  version int not null,
  trained_at timestamptz not null default now(),
  accuracy numeric,
  artifact_path text
);

create table public.active_model_modes (
  stage text primary key check (stage in ('pre', 'post')),
  mode text not null check (mode in ('dummy', 'sensor')),
  updated_at timestamptz not null default now()
);

insert into public.active_model_modes (stage, mode) values ('pre', 'dummy'), ('post', 'dummy');

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, device_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'device_number', '')
  );
  if nullif(new.raw_user_meta_data ->> 'device_number', '') is not null then
    insert into public.devices (id, owner_id, api_key)
    values (new.raw_user_meta_data ->> 'device_number', new.id, 'placeholder')
    on conflict (id) do update set owner_id = excluded.owner_id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.readings enable row level security;
alter table public.alerts enable row level security;
alter table public.model_versions enable row level security;
alter table public.active_model_modes enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "update own profile" on public.profiles for update using (id = auth.uid());

create policy "own devices" on public.devices for select using (owner_id = auth.uid() or public.is_admin());
create policy "claim device" on public.devices for insert with check (owner_id = auth.uid());
create policy "update own devices" on public.devices for update using (owner_id = auth.uid() or public.is_admin());

create policy "own readings" on public.readings for select using (
  device_id in (select id from public.devices where owner_id = auth.uid()) or public.is_admin()
);
create policy "admin sample readings" on public.readings for insert with check (public.is_admin());

create policy "own alerts" on public.alerts for select using (user_id = auth.uid() or public.is_admin());
create policy "admin alerts" on public.alerts for insert with check (public.is_admin());
create policy "acknowledge alerts" on public.alerts for update using (user_id = auth.uid() or public.is_admin());

create policy "admin only model_versions" on public.model_versions for select using (public.is_admin());
create policy "admin model_versions insert" on public.model_versions for insert with check (public.is_admin());
create policy "read active model modes" on public.active_model_modes for select using (true);
create policy "admin active model modes" on public.active_model_modes for all using (public.is_admin()) with check (public.is_admin());

alter publication supabase_realtime add table public.alerts;

create or replace view public.public_insights as
select
  stage,
  avg(nullif(sensor_values ->> 'pH', '')::numeric) as avg_ph,
  avg(nullif(sensor_values ->> 'turbidity', '')::numeric) as avg_turbidity,
  avg(nullif(sensor_values ->> 'TDS', '')::numeric) as avg_tds,
  count(*) as reading_count,
  date_trunc('hour', created_at) as bucket
from public.readings
group by stage, bucket;

grant select on public.public_insights to anon, authenticated;