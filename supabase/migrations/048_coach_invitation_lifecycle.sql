alter table public.tenant_invitations
  add column if not exists invitation_kind text not null default 'personalized_member'
    constraint tenant_invitations_kind_check
      check (invitation_kind in ('personalized_member', 'coach_admin')),
  add column if not exists last_sent_at timestamptz,
  add column if not exists resend_count integer not null default 0
    constraint tenant_invitations_resend_count_check check (resend_count >= 0);

create index if not exists tenant_invitations_coach_status_expiry_idx
  on public.tenant_invitations (tenant_id, invitation_kind, status, expires_at);

create or replace function public.expire_coach_invitations()
returns integer
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.tenant_invitations as i
    set status = 'EXPIRED'
    where i.invitation_kind = 'coach_admin'
      and i.status = 'PENDING'
      and i.expires_at <= pg_catalog.now()
    returning i.id
  )
  select pg_catalog.count(*)::integer from expired;
$$;

revoke all on function public.expire_coach_invitations() from public, anon, authenticated;
grant execute on function public.expire_coach_invitations() to service_role;

comment on table public.tenant_invitations is
  'Trusted-server-managed invitations for personalized members and platform-provisioned coaches.';
