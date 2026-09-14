create table public.app_secrets (
  key text primary key,
  value text not null
);

insert into public.app_secrets (key, value)
values ('admin_signup_code', 'admin123')
on conflict (key) do nothing;

alter table public.app_secrets enable row level security;

create or replace function public.claim_admin_role(code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  correct_code text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select value into correct_code
  from public.app_secrets
  where key = 'admin_signup_code';

  if code is null or code <> correct_code then
    raise exception 'Invalid admin code';
  end if;

  update public.profiles
  set role = 'admin'
  where id = auth.uid();
end;
$$;

revoke all on table public.app_secrets from anon, authenticated;
grant execute on function public.claim_admin_role(text) to authenticated;