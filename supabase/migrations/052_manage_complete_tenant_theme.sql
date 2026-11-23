create function public.set_own_tenant_theme(p_theme jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid := private.current_profile_tenant_id();
  v_theme jsonb;
  v_key text;
  v_color text;
  v_font text;
  v_allowed_fonts text[] := array[
    'DM Sans', 'Fraunces', 'Inter', 'Sora', 'Roboto', 'Montserrat',
    'Poppins', 'Manrope', 'Lato', 'Nunito', 'Merriweather',
    'Playfair Display', 'Source Serif 4', 'Raleway', 'Work Sans'
  ];
begin
  if auth.uid() is null
    or not private.current_profile_is_active()
    or private.current_profile_role() <> 'coach_admin'
    or not private.current_profile_tenant_is_active()
    or v_tenant_id is null
  then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  if pg_catalog.jsonb_typeof(p_theme) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_theme';
  end if;

  for v_key, v_color in
    select key, value
    from pg_catalog.jsonb_each_text(p_theme)
    where key in (
      'primaryColor', 'secondaryColor', 'backgroundColor', 'accentColor',
      'surfaceColor', 'textColor', 'mutedColor', 'borderColor',
      'warmAccentColor', 'softAccentColor'
    )
  loop
    if v_color !~ '^#[0-9A-Fa-f]{6}$' then
      raise exception using errcode = '22023', message = 'invalid_theme_color';
    end if;
  end loop;

  v_font := p_theme->>'bodyFont';
  if v_font is not null and not (v_font = any(v_allowed_fonts)) then
    raise exception using errcode = '22023', message = 'invalid_theme_font';
  end if;
  v_font := p_theme->>'displayFont';
  if v_font is not null and not (v_font = any(v_allowed_fonts)) then
    raise exception using errcode = '22023', message = 'invalid_theme_font';
  end if;

  update public.tenants as tenant
  set theme = tenant.theme || p_theme
  where tenant.id = v_tenant_id
  returning tenant.theme into v_theme;

  if v_theme is null then
    raise exception using errcode = 'P0002', message = 'tenant_not_found';
  end if;

  return v_theme;
end;
$$;

revoke all on function public.set_own_tenant_theme(jsonb) from public, anon, authenticated;
grant execute on function public.set_own_tenant_theme(jsonb) to authenticated;
