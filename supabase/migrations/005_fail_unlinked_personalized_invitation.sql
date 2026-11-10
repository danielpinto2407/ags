-- CU-01B: release temporary membership allocation when Auth invite creation fails.

begin;

create function public.fail_personalized_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_invitation public.tenant_invitations%rowtype;
begin
  select i.tenant_id
  into v_tenant_id
  from public.tenant_invitations as i
  where i.id = p_invitation_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'invitation_not_found';
  end if;

  perform 1
  from public.tenants as t
  where t.id = v_tenant_id
  for update;

  select i.*
  into v_invitation
  from public.tenant_invitations as i
  where i.id = p_invitation_id
  for update;

  if v_invitation.status = 'FAILED' and v_invitation.auth_user_id is null then
    return true;
  end if;
  if v_invitation.status <> 'PENDING' or v_invitation.auth_user_id is not null then
    raise exception using errcode = 'P0001', message = 'invitation_not_unlinked_pending';
  end if;

  update public.tenant_invitations as i
  set status = 'FAILED'
  where i.id = p_invitation_id;

  return true;
end;
$$;

revoke all on function public.fail_personalized_invitation(uuid)
  from public, anon, authenticated;
grant execute on function public.fail_personalized_invitation(uuid)
  to service_role;

comment on function public.fail_personalized_invitation(uuid) is
  'Marks an unlinked pending onboarding attempt as failed so it no longer occupies gym membership capacity.';

commit;