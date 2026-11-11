begin;

create type public.routine_assignment_status as enum (
  'DRAFT',
  'PUBLISHED'
);

alter table public.tenant_exercises
  add constraint tenant_exercises_id_tenant_id_unique unique (id, tenant_id);

create table public.routine_assignments (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  coach_id uuid not null,
  student_id uuid not null,
  scheduled_for date not null,
  title text not null default 'Rutina personalizada'
    check (length(btrim(title)) between 1 and 120),
  status public.routine_assignment_status not null default 'DRAFT',
  published_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint routine_assignments_coach_tenant_fk
    foreign key (coach_id, tenant_id)
    references public.profiles (id, tenant_id)
    on delete restrict,
  constraint routine_assignments_student_tenant_fk
    foreign key (student_id, tenant_id)
    references public.profiles (id, tenant_id)
    on delete restrict,
  constraint routine_assignments_id_tenant_unique unique (id, tenant_id),
  constraint routine_assignments_publication_state_check check (
    (status = 'DRAFT' and published_at is null)
    or (status = 'PUBLISHED' and published_at is not null)
  ),
  constraint routine_assignments_one_per_student_date unique (tenant_id, student_id, scheduled_for)
);

create table public.routine_assignment_items (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  tenant_id uuid not null,
  assignment_id uuid not null,
  position integer not null check (position >= 0),
  catalog_exercise_id uuid references public.exercise_catalog (id) on delete restrict,
  tenant_exercise_id uuid,
  exercise_snapshot jsonb not null,
  prescribed_sets smallint not null check (prescribed_sets between 1 and 50),
  prescribed_reps text not null check (length(btrim(prescribed_reps)) between 1 and 80),
  target_load text not null default '' check (length(target_load) <= 80),
  work_duration text check (work_duration is null or length(work_duration) <= 80),
  rest text not null default '' check (length(rest) <= 80),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint routine_assignment_items_assignment_tenant_fk
    foreign key (assignment_id, tenant_id)
    references public.routine_assignments (id, tenant_id)
    on delete cascade,
  constraint routine_assignment_items_tenant_exercise_fk
    foreign key (tenant_exercise_id, tenant_id)
    references public.tenant_exercises (id, tenant_id)
    on delete restrict,
  constraint routine_assignment_items_one_exercise_source_check check (
    (catalog_exercise_id is not null and tenant_exercise_id is null)
    or (catalog_exercise_id is null and tenant_exercise_id is not null)
  ),
  constraint routine_assignment_items_snapshot_check check (
    jsonb_typeof(exercise_snapshot) = 'object'
    and exercise_snapshot ?& array[
      'id', 'name', 'focus', 'primaryMuscles', 'secondaryMuscles', 'equipment',
      'movementPattern', 'difficulty', 'instructions', 'tips', 'videoUrl'
    ]
    and jsonb_typeof(exercise_snapshot -> 'primaryMuscles') = 'array'
    and jsonb_typeof(exercise_snapshot -> 'secondaryMuscles') = 'array'
    and jsonb_typeof(exercise_snapshot -> 'equipment') = 'array'
    and jsonb_typeof(exercise_snapshot -> 'name') = 'string'
    and length(btrim(exercise_snapshot ->> 'name')) > 0
  ),
  constraint routine_assignment_items_position_unique unique (assignment_id, position)
);

create index routine_assignments_coach_date_idx
  on public.routine_assignments (tenant_id, coach_id, scheduled_for desc);
create index routine_assignments_student_date_idx
  on public.routine_assignments (tenant_id, student_id, scheduled_for desc);
create index routine_assignment_items_assignment_position_idx
  on public.routine_assignment_items (assignment_id, position);

create trigger routine_assignments_set_updated_at
  before update on public.routine_assignments
  for each row execute function private.set_updated_at();

create trigger routine_assignment_items_set_updated_at
  before update on public.routine_assignment_items
  for each row execute function private.set_updated_at();

create function private.snapshot_routine_assignment_exercise()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.tenant_id is distinct from old.tenant_id
      or new.assignment_id is distinct from old.assignment_id
      or new.catalog_exercise_id is distinct from old.catalog_exercise_id
      or new.tenant_exercise_id is distinct from old.tenant_exercise_id
      or new.exercise_snapshot is distinct from old.exercise_snapshot
      or new.created_at is distinct from old.created_at
    then
      raise exception using errcode = '42501', message = 'routine_item_snapshot_immutable';
    end if;
    return new;
  end if;

  if new.catalog_exercise_id is not null then
    select pg_catalog.jsonb_build_object(
      'id', e.id,
      'name', e.name,
      'focus', e.focus,
      'primaryMuscles', e.primary_muscles,
      'secondaryMuscles', e.secondary_muscles,
      'equipment', e.equipment,
      'movementPattern', e.movement_pattern,
      'difficulty', e.difficulty,
      'instructions', e.instructions,
      'tips', e.tips,
      'videoUrl', e.video_url
    )
    into new.exercise_snapshot
    from public.exercise_catalog as e
    where e.id = new.catalog_exercise_id
      and e.archived_at is null;
  else
    select pg_catalog.jsonb_build_object(
      'id', e.id,
      'name', e.name,
      'focus', e.focus,
      'primaryMuscles', e.primary_muscles,
      'secondaryMuscles', e.secondary_muscles,
      'equipment', e.equipment,
      'movementPattern', e.movement_pattern,
      'difficulty', e.difficulty,
      'instructions', e.instructions,
      'tips', e.tips,
      'videoUrl', e.video_url
    )
    into new.exercise_snapshot
    from public.tenant_exercises as e
    where e.id = new.tenant_exercise_id
      and e.tenant_id = new.tenant_id
      and e.archived_at is null;
  end if;

  if new.exercise_snapshot is null then
    raise exception using errcode = '23503', message = 'routine_exercise_unavailable';
  end if;

  return new;
end;
$$;

revoke all on function private.snapshot_routine_assignment_exercise() from public, anon, authenticated;

create trigger routine_assignment_items_snapshot
  before insert or update on public.routine_assignment_items
  for each row execute function private.snapshot_routine_assignment_exercise();

create function public.publish_routine_assignment(p_assignment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_tenant_id uuid;
  v_actor_role public.app_role;
  v_actor_status public.profile_status;
  v_tenant_status public.tenant_status;
  v_assignment public.routine_assignments%rowtype;
  v_student_status public.profile_status;
  v_item_count bigint;
begin
  select p.tenant_id, p.role, p.status
  into v_actor_tenant_id, v_actor_role, v_actor_status
  from public.profiles as p
  where p.id = (select auth.uid());

  if not found or v_actor_role <> 'coach_admin' or v_actor_status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'coach_access_required';
  end if;

  select t.status
  into v_tenant_status
  from public.tenants as t
  where t.id = v_actor_tenant_id;

  if not found or v_tenant_status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'gym_not_active';
  end if;

  select ra.*
  into v_assignment
  from public.routine_assignments as ra
  where ra.id = p_assignment_id
    and ra.tenant_id = v_actor_tenant_id
    and ra.coach_id = (select auth.uid())
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'assignment_not_owned';
  end if;
  if v_assignment.status <> 'DRAFT' then
    raise exception using errcode = 'P0001', message = 'assignment_not_draft';
  end if;

  select p.status
  into v_student_status
  from public.profiles as p
  where p.id = v_assignment.student_id
    and p.tenant_id = v_assignment.tenant_id
    and p.role = 'user_personalized'
    and p.coach_id = (select auth.uid());

  if not found or v_student_status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'student_not_active_or_owned';
  end if;

  select pg_catalog.count(*)
  into v_item_count
  from public.routine_assignment_items as item
  where item.assignment_id = v_assignment.id
    and item.tenant_id = v_assignment.tenant_id;

  if v_item_count = 0 then
    raise exception using errcode = 'P0001', message = 'assignment_has_no_exercises';
  end if;

  update public.routine_assignments as ra
  set status = 'PUBLISHED',
      published_at = pg_catalog.now()
  where ra.id = v_assignment.id;

  return v_assignment.id;
end;
$$;

revoke all on function public.publish_routine_assignment(uuid) from public, anon;
grant execute on function public.publish_routine_assignment(uuid) to authenticated;

alter table public.routine_assignments enable row level security;
alter table public.routine_assignment_items enable row level security;

revoke all on table public.routine_assignments from public, anon, authenticated;
revoke all on table public.routine_assignment_items from public, anon, authenticated;
grant select, insert on table public.routine_assignments to authenticated;
grant update (scheduled_for, title) on table public.routine_assignments to authenticated;
grant select, insert, delete on table public.routine_assignment_items to authenticated;
grant update (position, prescribed_sets, prescribed_reps, target_load, work_duration, rest)
  on table public.routine_assignment_items to authenticated;
grant all on table public.routine_assignments to service_role;
grant all on table public.routine_assignment_items to service_role;

create policy routine_assignments_select_authorized_participant
  on public.routine_assignments
  for select
  to authenticated
  using (
    (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
    and (
      (
        (select private.current_profile_role()) = 'coach_admin'
        and coach_id = (select auth.uid())
        and tenant_id = (select private.current_profile_tenant_id())
      )
      or (
        (select private.current_profile_role()) = 'user_personalized'
        and student_id = (select auth.uid())
        and tenant_id = (select private.current_profile_tenant_id())
        and status = 'PUBLISHED'
      )
    )
  );

create policy routine_assignments_insert_coach_owned_student
  on public.routine_assignments
  for insert
  to authenticated
  with check (
    status = 'DRAFT'
    and published_at is null
    and coach_id = (select auth.uid())
    and tenant_id = (select private.current_profile_tenant_id())
    and (select private.current_profile_role()) = 'coach_admin'
    and (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
    and exists (
      select 1
      from public.profiles as student
      where student.id = student_id
        and student.tenant_id = tenant_id
        and student.role = 'user_personalized'
        and student.status = 'ACTIVE'
        and student.coach_id = (select auth.uid())
    )
  );

create policy routine_assignments_update_owned_draft
  on public.routine_assignments
  for update
  to authenticated
  using (
    status = 'DRAFT'
    and coach_id = (select auth.uid())
    and tenant_id = (select private.current_profile_tenant_id())
    and (select private.current_profile_role()) = 'coach_admin'
    and (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
  )
  with check (
    status = 'DRAFT'
    and published_at is null
    and coach_id = (select auth.uid())
    and tenant_id = (select private.current_profile_tenant_id())
    and (select private.current_profile_role()) = 'coach_admin'
    and (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
    and exists (
      select 1
      from public.profiles as student
      where student.id = student_id
        and student.tenant_id = tenant_id
        and student.role = 'user_personalized'
        and student.status = 'ACTIVE'
        and student.coach_id = (select auth.uid())
    )
  );

create policy routine_assignment_items_select_visible_assignment
  on public.routine_assignment_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.routine_assignments as assignment
      where assignment.id = assignment_id
        and assignment.tenant_id = tenant_id
        and (
          (
            assignment.coach_id = (select auth.uid())
            and assignment.tenant_id = (select private.current_profile_tenant_id())
            and (select private.current_profile_role()) = 'coach_admin'
            and (select private.current_profile_is_active())
            and (select private.current_profile_tenant_is_active())
          )
          or (
            assignment.student_id = (select auth.uid())
            and assignment.status = 'PUBLISHED'
            and assignment.tenant_id = (select private.current_profile_tenant_id())
            and (select private.current_profile_role()) = 'user_personalized'
            and (select private.current_profile_is_active())
            and (select private.current_profile_tenant_is_active())
          )
        )
    )
  );

create policy routine_assignment_items_insert_owned_draft
  on public.routine_assignment_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.routine_assignments as assignment
      where assignment.id = assignment_id
        and assignment.tenant_id = tenant_id
        and assignment.status = 'DRAFT'
        and assignment.coach_id = (select auth.uid())
        and assignment.tenant_id = (select private.current_profile_tenant_id())
        and (select private.current_profile_role()) = 'coach_admin'
        and (select private.current_profile_is_active())
        and (select private.current_profile_tenant_is_active())
    )
    and (
      (catalog_exercise_id is not null and tenant_exercise_id is null)
      or (
        catalog_exercise_id is null
        and tenant_exercise_id is not null
        and exists (
          select 1
          from public.tenant_exercises as exercise
          where exercise.id = tenant_exercise_id
            and exercise.tenant_id = tenant_id
            and exercise.archived_at is null
        )
      )
    )
  );

create policy routine_assignment_items_update_owned_draft
  on public.routine_assignment_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.routine_assignments as assignment
      where assignment.id = assignment_id
        and assignment.tenant_id = tenant_id
        and assignment.status = 'DRAFT'
        and assignment.coach_id = (select auth.uid())
        and assignment.tenant_id = (select private.current_profile_tenant_id())
        and (select private.current_profile_role()) = 'coach_admin'
        and (select private.current_profile_is_active())
        and (select private.current_profile_tenant_is_active())
    )
  )
  with check (
    exists (
      select 1
      from public.routine_assignments as assignment
      where assignment.id = assignment_id
        and assignment.tenant_id = tenant_id
        and assignment.status = 'DRAFT'
        and assignment.coach_id = (select auth.uid())
        and assignment.tenant_id = (select private.current_profile_tenant_id())
        and (select private.current_profile_role()) = 'coach_admin'
        and (select private.current_profile_is_active())
        and (select private.current_profile_tenant_is_active())
    )
  );

create policy routine_assignment_items_delete_owned_draft
  on public.routine_assignment_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.routine_assignments as assignment
      where assignment.id = assignment_id
        and assignment.tenant_id = tenant_id
        and assignment.status = 'DRAFT'
        and assignment.coach_id = (select auth.uid())
        and assignment.tenant_id = (select private.current_profile_tenant_id())
        and (select private.current_profile_role()) = 'coach_admin'
        and (select private.current_profile_is_active())
        and (select private.current_profile_tenant_is_active())
    )
  );

comment on table public.routine_assignments is
  'A coach-owned personalized routine assigned to one member and calendar date; students see published assignments only.';
comment on table public.routine_assignment_items is
  'Ordered exercise prescriptions for an assignment; exercise definitions are snapshotted at insert and immutable afterward.';
comment on column public.routine_assignment_items.exercise_snapshot is
  'Immutable camelCase ExerciseDefinition snapshot used by this assignment, independent of later catalog edits.';
comment on function public.publish_routine_assignment(uuid) is
  'Atomically publishes a non-empty draft owned by the active coach to their active personalized member.';

commit;