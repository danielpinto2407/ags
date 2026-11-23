create function public.accept_coach_invitation(
  p_invitation_id uuid,
  p_auth_user_id uuid,
  p_full_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.tenant_invitations%rowtype;
  v_auth_email text;
  v_tenant_status public.tenant_status;
  v_super_admin public.app_role;
  v_super_admin_status public.profile_status;
  v_super_admin_tenant_id uuid;
begin
  if p_full_name is null or char_length(btrim(p_full_name)) < 2 or char_length(btrim(p_full_name)) > 120 then
    raise exception using errcode = '22023', message = 'invalid_full_name';
  end if;

  select i.* into v_invitation
  from public.tenant_invitations as i
  where i.id = p_invitation_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'invitation_not_found';
  end if;
  if v_invitation.invitation_kind <> 'coach_admin' then
    raise exception using errcode = 'P0001', message = 'invalid_invitation_kind';
  end if;
  if v_invitation.status <> 'PENDING' then
    raise exception using errcode = 'P0001', message = 'invitation_not_pending';
  end if;
  if v_invitation.expires_at <= pg_catalog.now() then
    raise exception using errcode = 'P0001', message = 'invitation_expired';
  end if;
  if v_invitation.auth_user_id is distinct from p_auth_user_id then
    raise exception using errcode = 'P0001', message = 'invitation_not_pending';
  end if;

  select lower(btrim(u.email)) into v_auth_email
  from auth.users as u
  where u.id = p_auth_user_id;

  if not found or v_auth_email <> v_invitation.email then
    raise exception using errcode = '42501', message = 'invite_email_mismatch';
  end if;

  select t.status into v_tenant_status
  from public.tenants as t
  where t.id = v_invitation.tenant_id;
  if not found or v_tenant_status <> 'ACTIVE' then
    raise exception using errcode = 'P0001', message = 'tenant_inactive';
  end if;

  select p.role, p.status, p.tenant_id
  into v_super_admin, v_super_admin_status, v_super_admin_tenant_id
  from public.profiles as p
  where p.id = v_invitation.invited_by;
  if not found or v_super_admin <> 'super_admin' or v_super_admin_status <> 'ACTIVE' or v_super_admin_tenant_id is not null then
    raise exception using errcode = '42501', message = 'inviter_not_eligible';
  end if;

  if exists (
    select 1 from public.profiles
    where id = p_auth_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'account_not_eligible';
  end if;

  insert into public.profiles (id, tenant_id, role, status, full_name)
  values (p_auth_user_id, v_invitation.tenant_id, 'coach_admin', 'ACTIVE', btrim(p_full_name));

  update public.tenant_invitations
  set status = 'ACCEPTED', accepted_at = pg_catalog.now(), auth_user_id = p_auth_user_id
  where id = p_invitation_id;
end;
$$;

revoke all on function public.accept_coach_invitation(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.accept_coach_invitation(uuid, uuid, text) to service_role;
