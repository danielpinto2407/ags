begin;

create table public.routine_execution_comments (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  tenant_id uuid not null,
  execution_id uuid not null,
  author_id uuid not null,
  body text not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint routine_execution_comments_tenant_fk
    foreign key (tenant_id)
    references public.tenants (id),
  constraint routine_execution_comments_execution_tenant_fk
    foreign key (execution_id, tenant_id)
    references public.routine_executions (id, tenant_id),
  constraint routine_execution_comments_author_tenant_fk
    foreign key (author_id, tenant_id)
    references public.profiles (id, tenant_id),
  constraint routine_execution_comments_body_check
    check (
      pg_catalog.btrim(body) <> ''
      and pg_catalog.char_length(body) between 1 and 2000
      and pg_catalog.btrim(body) = body
    ),
  constraint routine_execution_comments_id_tenant_unique unique (id, tenant_id)
);

create index routine_execution_comments_execution_created_idx
  on public.routine_execution_comments (tenant_id, execution_id, created_at);

alter table public.routine_execution_comments enable row level security;
revoke all on table public.routine_execution_comments from public, anon, authenticated;

grant select, insert on table public.routine_execution_comments to authenticated;

drop policy if exists routine_execution_comments_select_participant
  on public.routine_execution_comments;
create policy routine_execution_comments_select_participant
  on public.routine_execution_comments
  for select
  to authenticated
  using (
    (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
    and tenant_id = (select private.current_profile_tenant_id())
    and exists (
      select 1
      from public.routine_executions as execution
      join public.profiles as student
        on student.id = execution.student_id
        and student.tenant_id = execution.tenant_id
      join public.routine_assignments as assignment
        on assignment.id = execution.assignment_id
        and assignment.tenant_id = execution.tenant_id
      where execution.id = routine_execution_comments.execution_id
        and execution.tenant_id = routine_execution_comments.tenant_id
        and (
          (
            execution.student_id = (select auth.uid())
            and (select private.current_profile_role()) = 'user_personalized'
          )
          or (
            (select private.current_profile_role()) = 'coach_admin'
            and student.status = 'ACTIVE'
            and student.coach_id = (select auth.uid())
            and assignment.coach_id = (select auth.uid())
            and assignment.status = 'PUBLISHED'
          )
        )
    )
  );

drop policy if exists routine_execution_comments_insert_participant
  on public.routine_execution_comments;
create policy routine_execution_comments_insert_participant
  on public.routine_execution_comments
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
    and tenant_id = (select private.current_profile_tenant_id())
    and exists (
      select 1
      from public.routine_executions as execution
      join public.profiles as student
        on student.id = execution.student_id
        and student.tenant_id = execution.tenant_id
      join public.routine_assignments as assignment
        on assignment.id = execution.assignment_id
        and assignment.tenant_id = execution.tenant_id
      where execution.id = routine_execution_comments.execution_id
        and execution.tenant_id = routine_execution_comments.tenant_id
        and (
          (
            execution.student_id = (select auth.uid())
            and (select private.current_profile_role()) = 'user_personalized'
          )
          or (
            (select private.current_profile_role()) = 'coach_admin'
            and student.status = 'ACTIVE'
            and student.coach_id = (select auth.uid())
            and assignment.coach_id = (select auth.uid())
            and assignment.status = 'PUBLISHED'
          )
        )
    )
  );

comment on table public.routine_execution_comments is
  'Chronological plain-text feedback between the assigned coach and owning student for one registered workout execution.';

commit;
