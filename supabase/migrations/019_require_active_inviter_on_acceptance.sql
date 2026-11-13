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
  v_tenant_status public.tenant_status;
  v_invitation public.tenant_invitations%rowtype;
  v_auth_email text;
  v_profile_tenant_id uuid;
  v_profile_role public.app_role;
  v_profile_status public.profile_status;
  v_inviter_tenant_id uuid;
  v_inviter_role public.app_role;
  v_inviter_status public.profile_status;
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
  into v_inviter_tenant_id, v_inviter_role, v_inviter_status
  from public.profiles as p
  where p.id = v_invitation.invited_by
  for share;

  if not found
    or v_inviter_tenant_id <> v_tenant_id
    or v_inviter_role <> 'coach_admin'
    or v_inviter_status is distinct from 'ACTIVE'
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