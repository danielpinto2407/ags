begin;

create function private.sync_recovery_branding_for_tenant(p_tenant_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update auth.users as auth_user
  set raw_user_meta_data = coalesce(auth_user.raw_user_meta_data, '{}'::jsonb)
    || pg_catalog.jsonb_build_object(
      'gym_name', coalesce(nullif(pg_catalog.btrim(tenant.name), ''), 'tu gimnasio'),
      'gym_logo_url', case
        when tenant.theme->>'logoUrl' ~ '^https://[^[:space:]]+$' then tenant.theme->>'logoUrl'
        else ''
      end,
      'gym_primary_color', case
        when tenant.theme->>'primaryColor' ~* '^#[0-9a-f]{6}$' then tenant.theme->>'primaryColor'
        else '#7b2545'
      end,
      'gym_accent_color', case
        when tenant.theme->>'accentColor' ~* '^#[0-9a-f]{6}$' then tenant.theme->>'accentColor'
        else '#d8bac4'
      end,
      'gym_background_color', case
        when tenant.theme->>'backgroundColor' ~* '^#[0-9a-f]{6}$' then tenant.theme->>'backgroundColor'
        else '#f4eae3'
      end,
      'gym_surface_color', case
        when tenant.theme->>'surfaceColor' ~* '^#[0-9a-f]{6}$' then tenant.theme->>'surfaceColor'
        else '#fff9f6'
      end,
      'gym_text_color', case
        when tenant.theme->>'textColor' ~* '^#[0-9a-f]{6}$' then tenant.theme->>'textColor'
        else '#2b2528'
      end,
      'gym_muted_color', case
        when tenant.theme->>'mutedColor' ~* '^#[0-9a-f]{6}$' then tenant.theme->>'mutedColor'
        else '#76696d'
      end,
      'gym_border_color', case
        when tenant.theme->>'borderColor' ~* '^#[0-9a-f]{6}$' then tenant.theme->>'borderColor'
        else '#e5d8d2'
      end
    )
  from public.profiles as profile
  join public.tenants as tenant on tenant.id = profile.tenant_id
  where profile.tenant_id = p_tenant_id
    and auth_user.id = profile.id;
$$;

revoke all on function private.sync_recovery_branding_for_tenant(uuid) from public, anon, authenticated, service_role;

create function private.sync_recovery_branding_after_tenant_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_recovery_branding_for_tenant(new.id);
  return new;
end;
$$;

revoke all on function private.sync_recovery_branding_after_tenant_change() from public, anon, authenticated, service_role;

create function private.sync_recovery_branding_after_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tenant_id is not null then
    perform private.sync_recovery_branding_for_tenant(new.tenant_id);
  end if;
  return new;
end;
$$;

revoke all on function private.sync_recovery_branding_after_profile_change() from public, anon, authenticated, service_role;

create trigger tenants_sync_recovery_branding_after_insert
  after insert on public.tenants
  for each row execute function private.sync_recovery_branding_after_tenant_change();

create trigger tenants_sync_recovery_branding_after_update
  after update of name, theme on public.tenants
  for each row
  when (old.name is distinct from new.name or old.theme is distinct from new.theme)
  execute function private.sync_recovery_branding_after_tenant_change();

create trigger profiles_sync_recovery_branding_after_insert
  after insert on public.profiles
  for each row execute function private.sync_recovery_branding_after_profile_change();

create trigger profiles_sync_recovery_branding_after_tenant_change
  after update of tenant_id on public.profiles
  for each row
  when (old.tenant_id is distinct from new.tenant_id)
  execute function private.sync_recovery_branding_after_profile_change();

do $$
declare
  v_tenant_id uuid;
begin
  for v_tenant_id in select tenant.id from public.tenants as tenant loop
    perform private.sync_recovery_branding_for_tenant(v_tenant_id);
  end loop;
end;
$$;

commit;
