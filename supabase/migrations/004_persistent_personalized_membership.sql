-- CU-01B: an invitation onboards a persistent personalized member; it is not a class booking.

begin;

create or replace function public.prepare_personalized_invitation(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_max_clients integer;
  v_tenant_status public.tenant_status;
  v_actor_tenant_id uuid;
  v_actor_role public.app_role;
  v_actor_status public.profile_status;
  v_invitation_id uuid;
  v_member_count bigint;
begin
  if v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'invalid_email';
  end if;

  select t.max_clients, t.status
  into v_max_clients, v_tenant_status
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

  -- Only an unlinked, abandoned onboarding attempt expires; a linked account remains a member.
  update public.tenant_invitations as i
  set status = 'EXPIRED'
  where i.tenant_id = p_tenant_id
    and i.status = 'PENDING'
    and i.auth_user_id is null
    and i.expires_at <= pg_catalog.now();

  select i.id
  into v_invitation_id
  from public.tenant_invitations as i
  where i.tenant_id = p_tenant_id
    and i.email = v_email
    and i.status = 'PENDING'
  for update;

  if found then
    update public.tenant_invitations as i
    set invited_by = p_actor_id,
        expires_at = pg_catalog.now() + interval '7 days'
    where i.id = v_invitation_id;
    return v_invitation_id;
  end if;

  if exists (
    select 1
    from auth.users as u
    join public.profiles as p on p.id = u.id
    where lower(btrim(u.email)) = v_email
      and p.tenant_id = p_tenant_id
      and p.role = 'user_personalized'
  ) then
    raise exception using errcode = 'P0001', message = 'already_member';
  end if;

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
    )
  into v_member_count;

  if v_member_count >= v_max_clients then
    raise exception using errcode = 'P0001', message = 'capacity_reached';
  end if;

  insert into public.tenant_invitations (tenant_id, email, invited_by)
  values (p_tenant_id, v_email, p_actor_id)
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;

create function public.link_personalized_invitation(
  p_invitation_id uuid,
  p_auth_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_tenant_status public.tenant_status;
  v_invitation public.tenant_invitations%rowtype;
  v_auth_email text;
begin
  select i.tenant_id
  into v_tenant_id
  from public.tenant_invitations as i
  where i.id = p_invitation_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'invitation_not_found';
  end if;

  select t.status
  into v_tenant_status
  from public.tenants as t
  where t.id = v_tenant_id
  for update;

  if v_tenant_status <> 'ACTIVE' then
    raise exception using errcode = 'P0001', message = 'tenant_inactive';
  end if;

  select i.*
  into v_invitation
  from public.tenant_invitations as i
  where i.id = p_invitation_id
  for update;

  if v_invitation.status <> 'PENDING' then
    raise exception using errcode = 'P0001', message = 'invitation_not_pending';
  end if;
  if v_invitation.expires_at <= pg_catalog.now() then
    raise exception using errcode = 'P0001', message = 'invitation_expired';
  end if;
  if v_invitation.auth_user_id is not null and v_invitation.auth_user_id <> p_auth_user_id then
    raise exception using errcode = 'P0001', message = 'auth_user_conflict';
  end if;

  select lower(btrim(u.email))
  into v_auth_email
  from auth.users as u
  where u.id = p_auth_user_id;

  if not found or v_auth_email <> v_invitation.email then
    raise exception using errcode = '42501', message = 'invite_email_mismatch';
  end if;

  update public.tenant_invitations as i
  set auth_user_id = p_auth_user_id
  where i.id = p_invitation_id;

  return p_invitation_id;
end;
$$;

create function public.accept_personalized_invitation(
  p_invitation_id uuid,
  p_auth_user_id uuid,
  p_full_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_max_clients integer;
  v_tenant_status public.tenant_status;
  v_invitation public.tenant_invitations%rowtype;
  v_auth_email text;
  v_profile_tenant_id uuid;
  v_profile_role public.app_role;
  v_profile_status public.profile_status;
  v_member_count bigint;
begin
  select i.tenant_id
  into v_tenant_id
  from public.tenant_invitations as i
  where i.id = p_invitation_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'invitation_not_found';
  end if;

  select t.max_clients, t.status
  into v_max_clients, v_tenant_status
  from public.tenants as t
  where t.id = v_tenant_id
  for update;

  if v_tenant_status <> 'ACTIVE' then
    raise exception using errcode = 'P0001', message = 'tenant_inactive';
  end if;

  select i.*
  into v_invitation
  from public.tenant_invitations as i
  where i.id = p_invitation_id
  for update;

  if v_invitation.status = 'ACCEPTED' and v_invitation.auth_user_id = p_auth_user_id then
    return p_auth_user_id;
  end if;
  if v_invitation.status <> 'PENDING'
    or v_invitation.auth_user_id is distinct from p_auth_user_id
  then
    raise exception using errcode = 'P0001', message = 'invitation_not_pending';
  end if;
  if v_invitation.expires_at <= pg_catalog.now() then
    raise exception using errcode = 'P0001', message = 'invitation_expired';
  end if;
  if p_full_name is null or length(btrim(p_full_name)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_full_name';
  end if;

  select lower(btrim(u.email))
  into v_auth_email
  from auth.users as u
  where u.id = p_auth_user_id;

  if not found or v_auth_email <> v_invitation.email then
    raise exception using errcode = '42501', message = 'invite_email_mismatch';
  end if;

  select p.tenant_id, p.role, p.status
  into v_profile_tenant_id, v_profile_role, v_profile_status
  from public.profiles as p
  where p.id = p_auth_user_id;

  if found then
    if v_profile_tenant_id <> v_tenant_id
      or v_profile_role <> 'user_personalized'
      or v_profile_status <> 'ACTIVE'
    then
      raise exception using errcode = 'P0001', message = 'account_not_eligible';
    end if;
  else
    select
      (
        select pg_catalog.count(*)
        from public.profiles as p
        where p.tenant_id = v_tenant_id
          and p.role = 'user_personalized'
          and p.status = 'ACTIVE'
      ) + (
        select pg_catalog.count(*)
        from public.tenant_invitations as i
        where i.tenant_id = v_tenant_id
          and i.status = 'PENDING'
      )
    into v_member_count;

    if v_member_count > v_max_clients then
      raise exception using errcode = 'P0001', message = 'capacity_reached';
    end if;

    insert into public.profiles (id, tenant_id, role, status, full_name)
    values (p_auth_user_id, v_tenant_id, 'user_personalized', 'ACTIVE', btrim(p_full_name));
  end if;

  update public.tenant_invitations as i
  set status = 'ACCEPTED',
      accepted_at = pg_catalog.now()
  where i.id = p_invitation_id;

  return p_auth_user_id;
end;
$$;

revoke all on function public.reserve_personalized_invitation(uuid, uuid, text)
  from public, anon, authenticated, service_role;
drop function public.reserve_personalized_invitation(uuid, uuid, text);

revoke all on function public.prepare_personalized_invitation(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.link_personalized_invitation(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.accept_personalized_invitation(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.prepare_personalized_invitation(uuid, uuid, text) to service_role;
grant execute on function public.link_personalized_invitation(uuid, uuid) to service_role;
grant execute on function public.accept_personalized_invitation(uuid, uuid, text) to service_role;

comment on table public.tenant_invitations is
  'Trusted onboarding records for persistent personalized users. Pending invitations count toward gym membership capacity; this is not class booking.';
comment on column public.tenant_invitations.expires_at is
  'Expiry of the current invite link. Once linked to an Auth account, link expiry does not release membership capacity.';
comment on function public.prepare_personalized_invitation(uuid, uuid, text) is
  'Creates or reuses a personalized-user onboarding record and accounts for its membership capacity; not a class reservation.';
comment on function public.link_personalized_invitation(uuid, uuid) is
  'Links the trusted Auth-invite result to its onboarding record after verifying the invited email.';
comment on function public.accept_personalized_invitation(uuid, uuid, text) is
  'Atomically activates the invited personalized profile and accepts onboarding; the profile remains a member until disabled.';

commit;