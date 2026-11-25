begin;

alter table public.profiles add column whatsapp_number text;

alter table public.profiles add constraint profiles_whatsapp_number_format
  check (whatsapp_number is null or (role = 'coach_admin' and whatsapp_number ~ '^[1-9][0-9]{7,14}$'));

create function public.set_own_coach_whatsapp_number(p_number text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_number text := nullif(pg_catalog.btrim(p_number), '');
begin
  if auth.uid() is null
    or not private.current_profile_is_active()
    or private.current_profile_role() <> 'coach_admin'
    or not private.current_profile_tenant_is_active()
  then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  if v_number is not null and v_number !~ '^[1-9][0-9]{7,14}$' then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_number';
  end if;

  update public.profiles
  set whatsapp_number = v_number
  where id = auth.uid() and role = 'coach_admin';

  return v_number;
end;
$$;

revoke all on function public.set_own_coach_whatsapp_number(text) from public, anon;
grant execute on function public.set_own_coach_whatsapp_number(text) to authenticated;

commit;