-- CU-01B foundation: personalized-user invitation reservations and tenant capacity.
-- Auth user creation and email delivery are performed by a trusted server function.

begin;

-- Existing tenants with an unset/invalid capacity receive the minimum valid limit.
update public.tenants
set max_clients = 1
where max_clients < 1;

alter table public.tenants
  alter column max_clients set default 1;

alter table public.tenants
  add constraint tenants_max_clients_positive check (max_clients >= 1);

create table public.tenant_invitations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles (id) on delete restrict,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED', 'FAILED')),
  created_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null default (pg_catalog.now() + interval '7 days'),
  accepted_at timestamptz,
  constraint tenant_invitations_email_normalized check (
    email = lower(btrim(email))
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+$'
  ),
  constraint tenant_invitations_expiry_after_creation check (expires_at > created_at),
  constraint tenant_invitations_acceptance_timestamp check (
    (status = 'ACCEPTED' and accepted_at is not null)
    or (status <> 'ACCEPTED' and accepted_at is null)
  )
);

create unique index tenant_invitations_one_pending_email_idx
  on public.tenant_invitations (tenant_id, email)
  where status = 'PENDING';

create index tenant_invitations_tenant_status_expiry_idx
  on public.tenant_invitations (tenant_id, status, expires_at);

alter table public.tenant_invitations enable row level security;
revoke all on table public.tenant_invitations from public, anon, authenticated;
grant all on table public.tenant_invitations to service_role;

create function public.reserve_personalized_invitation(
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
  v_reserved_count bigint;
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
    and i.expires_at > pg_catalog.now()
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
      and p.status = 'ACTIVE'
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
  into v_reserved_count;

  if v_reserved_count >= v_max_clients then
    raise exception using errcode = 'P0001', message = 'capacity_reached';
  end if;

  insert into public.tenant_invitations (tenant_id, email, invited_by)
  values (p_tenant_id, v_email, p_actor_id)
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;

revoke all on function public.reserve_personalized_invitation(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.reserve_personalized_invitation(uuid, uuid, text)
  to service_role;

comment on table public.tenant_invitations is
  'Trusted-server-managed invitations that reserve personalized-user tenant capacity until accepted, cancelled, failed, or expired.';
comment on function public.reserve_personalized_invitation(uuid, uuid, text) is
  'Atomically reserves one personalized-user slot; callable only by the trusted service role after validating the coach session.';

commit;