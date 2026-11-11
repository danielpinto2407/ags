-- CU-01B: let a coach toggle an invited personalized member's access.
-- Preserve the member identity/profile; activation must respect gym capacity.

begin;

create function public.set_personalized_member_status(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_member_id uuid,
  p_status public.profile_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_status public.tenant_status;
  v_max_clients integer;
  v_actor_tenant_id uuid;
  v_actor_role public.app_role;
  v_actor_status public.profile_status;
  v_member_tenant_id uuid;
  v_member_role public.app_role;
  v_member_status public.profile_status;
  v_member_coach_id uuid;
  v_reserved_count bigint;
begin
  if p_status not in ('ACTIVE', 'INACTIVE') then
    raise exception using errcode = '22023', message = 'invalid_member_status';
  end if;

  select t.status, t.max_clients
  into v_tenant_status, v_max_clients
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

  if v_member_status = p_status then
    return p_member_id;
  end if;

  if p_status = 'ACTIVE' then
    select
      (
        select pg_catalog.count(*)
        from public.profiles as p
        where p.tenant_id = p_tenant_id
          and p.role = 'user_personalized'
          and p.status = 'ACTIVE'
      ) + (
        select pg_catalog.count(*)
        from public.tenant_invitations as i
        where i.tenant_id = p_tenant_id
          and i.status = 'PENDING'
          and i.expires_at > pg_catalog.now()
      )
    into v_reserved_count;

    if v_reserved_count >= v_max_clients then
      raise exception using errcode = 'P0001', message = 'capacity_reached';
    end if;
  end if;

  update public.profiles
  set status = p_status
  where id = p_member_id;

  return p_member_id;
end;
$$;

revoke all on function public.set_personalized_member_status(uuid, uuid, uuid, public.profile_status)
  from public, anon, authenticated;
grant execute on function public.set_personalized_member_status(uuid, uuid, uuid, public.profile_status)
  to service_role;

comment on function public.set_personalized_member_status(uuid, uuid, uuid, public.profile_status) is
  'Lets an active coach toggle only their own same-tenant invitee. Reactivation reserves a member slot and obeys tenant capacity; profile and history are retained.';

commit;
