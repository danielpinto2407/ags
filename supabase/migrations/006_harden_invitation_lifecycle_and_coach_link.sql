-- CU-01B: expire invitation links with Auth's one-hour OTP window, reject replay,
-- and persist the inviting coach on the accepted personalized member profile.

begin;

alter table public.profiles
  add constraint profiles_id_tenant_id_unique unique (id, tenant_id);

alter table public.profiles
  add column coach_id uuid;

alter table public.profiles
  add constraint profiles_coach_user_role_check
    check (coach_id is null or role = 'user_personalized'),
  add constraint profiles_coach_same_tenant_fk
    foreign key (coach_id, tenant_id)
    references public.profiles (id, tenant_id)
    on delete set null (coach_id);

create index profiles_coach_id_idx on public.profiles (coach_id);

update public.profiles as p
set coach_id = i.invited_by
from public.tenant_invitations as i
where i.auth_user_id = p.id
  and i.tenant_id = p.tenant_id
  and i.status = 'ACCEPTED'
  and p.role = 'user_personalized';

alter table public.tenant_invitations
  alter column expires_at set default (pg_catalog.now() + interval '1 hour');

update public.tenant_invitations
set expires_at = least(expires_at, created_at + interval '1 hour')
where status = 'PENDING';

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

  update public.tenant_invitations as i
  set status = 'EXPIRED'
  where i.tenant_id = p_tenant_id
    and i.status = 'PENDING'
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
        expires_at = pg_catalog.now() + interval '1 hour'
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
        and i.expires_at > pg_catalog.now()
    )
  into v_member_count;

  if v_member_count >= v_max_clients then
    raise exception using errcode = 'P0001', message = 'capacity_reached';
  end if;

  -- Reuse an unaccepted Auth identity from an expired link; the Edge Function
  -- sends a fresh recovery link to the same verified email address.
  select i.id
  into v_invitation_id
  from public.tenant_invitations as i
  where i.tenant_id = p_tenant_id
    and i.email = v_email
    and i.status = 'EXPIRED'
    and i.auth_user_id is not null
    and not exists (
      select 1 from public.profiles as p where p.id = i.auth_user_id
    )
  order by i.created_at desc
  limit 1
  for update;

  if found then
    update public.tenant_invitations as i
    set status = 'PENDING',
        invited_by = p_actor_id,
        expires_at = pg_catalog.now() + interval '1 hour'
    where i.id = v_invitation_id;
    return v_invitation_id;
  end if;

  insert into public.tenant_invitations (tenant_id, email, invited_by)
  values (p_tenant_id, v_email, p_actor_id)
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;

create or replace function public.accept_personalized_invitation(
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
  v_inviter_tenant_id uuid;
  v_inviter_role public.app_role;
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

  select p.tenant_id, p.role
  into v_inviter_tenant_id, v_inviter_role
  from public.profiles as p
  where p.id = v_invitation.invited_by;

  if not found
    or v_inviter_tenant_id <> v_tenant_id
    or v_inviter_role <> 'coach_admin'
  then
    raise exception using errcode = 'P0001', message = 'inviter_not_eligible';
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

    update public.profiles
    set coach_id = v_invitation.invited_by
    where id = p_auth_user_id;
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
          and i.expires_at > pg_catalog.now()
      )
    into v_member_count;

    if v_member_count > v_max_clients then
      raise exception using errcode = 'P0001', message = 'capacity_reached';
    end if;

    insert into public.profiles (id, tenant_id, role, status, full_name, coach_id)
    values (
      p_auth_user_id,
      v_tenant_id,
      'user_personalized',
      'ACTIVE',
      btrim(p_full_name),
      v_invitation.invited_by
    );
  end if;

  update public.tenant_invitations as i
  set status = 'ACCEPTED',
      accepted_at = pg_catalog.now()
  where i.id = p_invitation_id;

  return p_auth_user_id;
end;
$$;

comment on column public.profiles.coach_id is
  'The same-tenant coach_admin who invited/owns this personalized member relationship.';
comment on column public.tenant_invitations.expires_at is
  'Expiry of the current single-use Auth email link; set to one hour to match Auth OTP expiry.';
comment on function public.accept_personalized_invitation(uuid, uuid, text) is
  'Atomically consumes a pending invitation once, verifies the signed-in Auth email, and creates a member profile linked to its inviting coach and tenant.';

commit;
