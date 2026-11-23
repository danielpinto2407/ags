create function public.set_platform_coach_status(
  p_actor_id uuid,
  p_coach_id uuid,
  p_status public.profile_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role public.app_role;
  v_actor_status public.profile_status;
  v_actor_tenant_id uuid;
  v_coach_tenant_id uuid;
  v_coach_role public.app_role;
begin
  if p_status not in ('ACTIVE', 'SUSPENDED') then
    raise exception using errcode = '22023', message = 'invalid_coach_status';
  end if;

  select p.role, p.status, p.tenant_id
  into v_actor_role, v_actor_status, v_actor_tenant_id
  from public.profiles as p
  where p.id = p_actor_id;

  if not found or v_actor_role <> 'super_admin' or v_actor_status <> 'ACTIVE' or v_actor_tenant_id is not null then
    raise exception using errcode = '42501', message = 'super_admin_required';
  end if;

  select p.tenant_id, p.role
  into v_coach_tenant_id, v_coach_role
  from public.profiles as p
  where p.id = p_coach_id
  for update;

  if not found or v_coach_role <> 'coach_admin' or v_coach_tenant_id is null then
    raise exception using errcode = '42501', message = 'coach_not_found';
  end if;

  update public.profiles
  set status = p_status
  where id = p_coach_id;

  return p_coach_id;
end;
$$;

revoke all on function public.set_platform_coach_status(uuid, uuid, public.profile_status) from public, anon, authenticated;
grant execute on function public.set_platform_coach_status(uuid, uuid, public.profile_status) to service_role;
