create or replace function public.list_coach_personalized_members()
returns table (
  member_id uuid,
  full_name text,
  member_status public.profile_status,
  created_at timestamptz,
  email text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    member.id,
    member.full_name,
    member.status,
    member.created_at,
    auth_user.email
  from public.profiles as member
  join auth.users as auth_user on auth_user.id = member.id
  join public.profiles as coach
    on coach.id = auth.uid()
   and coach.tenant_id = member.tenant_id
   and coach.role = 'coach_admin'
   and coach.status = 'ACTIVE'
  join public.tenants as tenant
    on tenant.id = coach.tenant_id
   and tenant.status = 'ACTIVE'
  where member.coach_id = coach.id
    and member.role = 'user_personalized'
  order by member.created_at desc;
$$;

revoke all on function public.list_coach_personalized_members() from public, anon;
grant execute on function public.list_coach_personalized_members() to authenticated;

comment on function public.list_coach_personalized_members() is
  'Lists personalized members and auth email for the active coach only; never exposes auth.users directly.';