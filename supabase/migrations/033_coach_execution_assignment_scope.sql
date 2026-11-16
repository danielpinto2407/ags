begin;

drop policy if exists routine_executions_select_participant on public.routine_executions;

create policy routine_executions_select_participant
  on public.routine_executions
  for select
  to authenticated
  using (
    (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
    and tenant_id = (select private.current_profile_tenant_id())
    and (
      (
        student_id = (select auth.uid())
        and (select private.current_profile_role()) = 'user_personalized'
      )
      or (
        (select private.current_profile_role()) = 'coach_admin'
        and exists (
          select 1
          from public.profiles as student
          join public.routine_assignments as assignment
            on assignment.student_id = student.id
            and assignment.tenant_id = student.tenant_id
          where student.id = routine_executions.student_id
            and student.tenant_id = routine_executions.tenant_id
            and student.coach_id = (select auth.uid())
            and student.status = 'ACTIVE'
            and assignment.id = routine_executions.assignment_id
            and assignment.coach_id = (select auth.uid())
            and assignment.status = 'PUBLISHED'
          limit 1
        )
      )
    )
  );

comment on policy routine_executions_select_participant on public.routine_executions is
  'Students read their own active-tenant executions. Coaches read only active assigned students executions from published assignments they authored.';

commit;
