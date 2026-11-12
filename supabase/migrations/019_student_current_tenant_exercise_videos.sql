begin;

create function public.get_student_current_tenant_exercise_videos(p_tenant_exercise_ids uuid[])
returns table (tenant_exercise_id uuid, video_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select exercise.id, exercise.video_url
  from public.profiles as student
  join public.tenants as tenant
    on tenant.id = student.tenant_id
   and tenant.status = 'ACTIVE'
  join public.tenant_exercises as exercise
    on exercise.tenant_id = student.tenant_id
  where student.id = (select auth.uid())
    and student.role = 'user_personalized'
    and student.status = 'ACTIVE'
    and exercise.id = any(coalesce(p_tenant_exercise_ids, array[]::uuid[]))
    and exists (
      select 1
      from public.routine_assignment_items as item
      join public.routine_assignments as assignment
        on assignment.id = item.assignment_id
       and assignment.tenant_id = item.tenant_id
      where assignment.student_id = student.id
        and assignment.tenant_id = student.tenant_id
        and assignment.status = 'PUBLISHED'
        and item.tenant_exercise_id = exercise.id
    );
$$;

revoke all on function public.get_student_current_tenant_exercise_videos(uuid[])
  from public, anon;
grant execute on function public.get_student_current_tenant_exercise_videos(uuid[])
  to authenticated;

comment on function public.get_student_current_tenant_exercise_videos(uuid[]) is
  'Returns only current video URLs for tenant exercises referenced by the authenticated active student''s published routines; assignment snapshots for all other exercise fields remain immutable.';

commit;