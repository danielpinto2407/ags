create function public.set_own_tenant_branding(
  p_primary_color text,
  p_secondary_color text,
  p_background_color text,
  p_accent_color text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid := private.current_profile_tenant_id();
  v_theme jsonb;
begin
  if auth.uid() is null
    or not private.current_profile_is_active()
    or private.current_profile_role() <> 'coach_admin'
    or not private.current_profile_tenant_is_active()
    or v_tenant_id is null
  then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  if p_primary_color !~ '^#[0-9A-Fa-f]{6}$'
    or p_secondary_color !~ '^#[0-9A-Fa-f]{6}$'
    or p_background_color !~ '^#[0-9A-Fa-f]{6}$'
    or p_accent_color !~ '^#[0-9A-Fa-f]{6}$'
  then
    raise exception using errcode = '22023', message = 'invalid_theme_color';
  end if;

  update public.tenants as tenant
  set theme = tenant.theme
    || jsonb_build_object(
      'primaryColor', upper(p_primary_color),
      'secondaryColor', upper(p_secondary_color),
      'backgroundColor', upper(p_background_color),
      'accentColor', upper(p_accent_color)
    )
  where tenant.id = v_tenant_id
  returning tenant.theme into v_theme;

  if v_theme is null then
    raise exception using errcode = 'P0002', message = 'tenant_not_found';
  end if;

  return v_theme;
end;
$$;

revoke all on function public.set_own_tenant_branding(text, text, text, text) from public, anon, authenticated;
grant execute on function public.set_own_tenant_branding(text, text, text, text) to authenticated;
