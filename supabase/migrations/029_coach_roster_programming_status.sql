begin;

drop function public.list_coach_personalized_members();

create function public.list_coach_personalized_members()
returns table (
  member_id uuid,
  full_name text,
  member_status public.profile_status,
  created_at timestamptz,
  email text,
  avatar_path text,
  has_active_programming boolean
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
    auth_user.email,
    member.avatar_path,
    exists (
      select 1
      from public.routine_assignments as assignment
      where assignment.tenant_id = member.tenant_id
        and assignment.student_id = member.id
        and assignment.status = 'PUBLISHED'
        and (
          (
            assignment.program_mode = 'SINGLE_DAY'
            and assignment.scheduled_for >= (pg_catalog.timezone('UTC', pg_catalog.now()))::date
          )
          or (
            assignment.program_mode = 'CYCLE'
            and exists (
              select 1
              from public.routine_assignment_days as day
              where day.assignment_id = assignment.id
                and (
                  select pg_catalog.count(*)
                  from public.routine_executions as execution
                  where execution.cycle_day_id = day.id
                ) < assignment.additional_cycle_repeats + 1
            )
          )
        )
    ) as has_active_programming
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
  'Lists only the active coach invitees and returns whether each has a current/future published single-day routine or a cycle slot with remaining attempts.';

commit;