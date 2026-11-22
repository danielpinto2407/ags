begin;

create or replace function private.sync_recovery_branding_for_tenant(p_tenant_id uuid)
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
      end,
      'gym_body_font', case
        when pg_catalog.jsonb_typeof(tenant.theme->'bodyFont') = 'string'
          and (tenant.theme->>'bodyFont' ~ '^[A-Za-z0-9][A-Za-z0-9 ]{0,48}[A-Za-z0-9]$'
            or tenant.theme->>'bodyFont' ~ '^[A-Za-z0-9]$') then tenant.theme->>'bodyFont'
        else ''
      end,
      'gym_display_font', case
        when pg_catalog.jsonb_typeof(tenant.theme->'displayFont') = 'string'
          and (tenant.theme->>'displayFont' ~ '^[A-Za-z0-9][A-Za-z0-9 ]{0,48}[A-Za-z0-9]$'
            or tenant.theme->>'displayFont' ~ '^[A-Za-z0-9]$') then tenant.theme->>'displayFont'
        else ''
      end
    )
  from public.profiles as profile
  join public.tenants as tenant on tenant.id = profile.tenant_id
  where profile.tenant_id = p_tenant_id
    and auth_user.id = profile.id;
$$;

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