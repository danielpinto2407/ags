begin;

create or replace function public.create_platform_tenant(
  p_name text,
  p_subdomain text,
  p_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_name text := pg_catalog.btrim(p_name);
  v_subdomain text := lower(pg_catalog.btrim(p_subdomain));
  v_description text := pg_catalog.btrim(p_description);
begin
  if (select private.current_profile_role()) is distinct from 'super_admin'
    or (select private.current_profile_is_active()) is false then
    raise exception using errcode = '42501', message = 'super_admin_required';
  end if;

  if pg_catalog.char_length(v_name) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'tenant_name_invalid';
  end if;
  if v_subdomain !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' then
    raise exception using errcode = '22023', message = 'tenant_subdomain_invalid';
  end if;
  if pg_catalog.char_length(v_description) > 280 then
    raise exception using errcode = '22023', message = 'tenant_description_invalid';
  end if;

  insert into public.tenants (name, subdomain, description, status, theme, features, max_clients)
  values (
    v_name,
    v_subdomain,
    v_description,
    'ACTIVE',
    '{"logoUrl":null,"primaryColor":"#7b2545","secondaryColor":"#572239","backgroundColor":"#f4eae3","accentColor":"#d8bac4","surfaceColor":"#fff9f6","textColor":"#2b2528","mutedColor":"#76696d","borderColor":"#e5d8d2","warmAccentColor":"#c4a47e","softAccentColor":"#c4b1d2","bodyFont":"DM Sans","displayFont":"Fraunces"}'::jsonb,
    '{"personalizedRoutines":true,"workoutTimer":true,"loadTracking":true,"whatsapp":true,"groupClasses":false}'::jsonb,
    1
  )
  returning id into v_tenant_id;

  return v_tenant_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'tenant_subdomain_taken';
end;
$$;

revoke all on function public.create_platform_tenant(text, text, text) from public, anon, authenticated;
grant execute on function public.create_platform_tenant(text, text, text) to authenticated;

commit;
