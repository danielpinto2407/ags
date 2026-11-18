begin;

alter table public.tenants
  add column description text not null default 'Rutinas personalizadas, seguimiento de progreso y comunicación directa con tu coach.'
    check (length(description) <= 280);

comment on column public.tenants.description is
  'Tenant-controlled short login description, displayed before authentication; maximum 280 characters.';

drop function public.resolve_tenant_by_subdomain(text);

create function public.resolve_tenant_by_subdomain(p_subdomain text)
returns table (
  tenant_id uuid,
  tenant_name text,
  tenant_subdomain text,
  tenant_status public.tenant_status,
  theme jsonb,
  features jsonb,
  tenant_description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select tenant.id, tenant.name, tenant.subdomain, tenant.status, tenant.theme, tenant.features, tenant.description
  from public.tenants as tenant
  where p_subdomain is not null
    and lower(btrim(p_subdomain)) ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
    and tenant.subdomain = lower(btrim(p_subdomain))
  limit 1;
$$;

revoke all on function public.resolve_tenant_by_subdomain(text) from public;
grant execute on function public.resolve_tenant_by_subdomain(text) to anon, authenticated;

create function public.set_own_tenant_description(p_description text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid := private.current_profile_tenant_id();
  v_description text := coalesce(btrim(p_description), '');
begin
  if auth.uid() is null
    or not private.current_profile_is_active()
    or private.current_profile_role() <> 'coach_admin'
    or not private.current_profile_tenant_is_active()
    or v_tenant_id is null
  then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  if length(v_description) > 280 then
    raise exception using errcode = '22023', message = 'tenant_description_too_long';
  end if;

  update public.tenants as tenant
  set description = v_description
  where tenant.id = v_tenant_id
  returning tenant.description into v_description;

  return v_description;
end;
$$;

revoke all on function public.set_own_tenant_description(text) from public, anon;
grant execute on function public.set_own_tenant_description(text) to authenticated;

comment on function public.resolve_tenant_by_subdomain(text) is
  'Returns allowlisted public tenant metadata needed to render pre-login tenant branding and description.';
comment on function public.set_own_tenant_description(text) is
  'Allows an active coach-admin to update only the description of their active tenant.';

commit;
