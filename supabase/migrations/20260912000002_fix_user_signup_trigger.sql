drop trigger if exists on_auth_user_created on auth.users;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
  normalized_device_number text;
  existing_owner_id uuid;
begin
  profile_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'User'
  );
  normalized_device_number := nullif(btrim(new.raw_user_meta_data ->> 'device_number'), '');

  insert into public.profiles (id, name, device_number)
  values (new.id, profile_name, normalized_device_number);

  if normalized_device_number is not null then
    insert into public.devices (id, owner_id, api_key)
    values (normalized_device_number, new.id, 'placeholder')
    on conflict (id) do update
      set owner_id = excluded.owner_id
      where devices.owner_id is null or devices.owner_id = excluded.owner_id;

    select owner_id into existing_owner_id
    from public.devices
    where id = normalized_device_number;

    if existing_owner_id is distinct from new.id then
      raise exception 'Device is already associated with another account';
    end if;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();