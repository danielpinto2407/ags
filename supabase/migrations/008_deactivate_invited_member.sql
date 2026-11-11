-- CU-01B: coaches can disable only personalized members they invited.
-- Keep the Auth identity, profile, invitation, and history; only revoke active access.

begin;

create function public.deactivate_personalized_member(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_member_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_status public.tenant_status;
  v_actor_tenant_id uuid;
  v_actor_role public.app_role;
  v_actor_status public.profile_status;
  v_member_tenant_id uuid;
  v_member_role public.app_role;
  v_member_status public.profile_status;
  v_member_coach_id uuid;
begin
  select t.status
  into v_tenant_status
  from public.tenants as t
  where t.id = p_tenant_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'tenant_not_found';
  end if;
  if v_tenant_status <> 'ACTIVE' then
    raise exception using errcode = 'P0001', message = 'tenant_inactive';
  end if;

  select p.tenant_id, p.role, p.status
  into v_actor_tenant_id, v_actor_role, v_actor_status
  from public.profiles as p
  where p.id = p_actor_id;

  if not found
    or v_actor_tenant_id <> p_tenant_id
    or v_actor_role <> 'coach_admin'
    or v_actor_status <> 'ACTIVE'
  then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  select p.tenant_id, p.role, p.status, p.coach_id
  into v_member_tenant_id, v_member_role, v_member_status, v_member_coach_id
  from public.profiles as p
  where p.id = p_member_id
  for update;

  if not found
    or v_member_tenant_id <> p_tenant_id
    or v_member_role <> 'user_personalized'
    or v_member_coach_id <> p_actor_id
  then
    raise exception using errcode = '42501', message = 'member_not_owned';
  end if;

  if v_member_status <> 'ACTIVE' then
    raise exception using errcode = 'P0001', message = 'member_not_active';
  end if;

  update public.profiles
  set status = 'INACTIVE'
  where id = p_member_id;

  return p_member_id;
end;
$$;

revoke all on function public.deactivate_personalized_member(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.deactivate_personalized_member(uuid, uuid, uuid)
  to service_role;

comment on function public.deactivate_personalized_member(uuid, uuid, uuid) is
  'Disables an active personalized member only for their own active same-tenant coach; preserves Auth identity, profile and historical data.';

commit;
