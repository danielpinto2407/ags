create or replace function public.save_routine_assignment_draft(
  p_assignment_id uuid,
  p_student_id uuid,
  p_scheduled_for date,
  p_title text,
  p_items jsonb
)
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
  v_student_status public.profile_status;
  v_assignment public.routine_assignments%rowtype;
  v_assignment_id uuid;
  v_item jsonb;
  v_source_id uuid;
  v_source_type text;
  v_position integer;
  v_item_count integer;
begin
  if p_scheduled_for is null
    or p_title is null
    or length(btrim(p_title)) not between 1 and 120
    or p_items is null
    or pg_catalog.jsonb_typeof(p_items) <> 'array'
    or pg_catalog.jsonb_array_length(p_items) > 50
  then
    raise exception using errcode = '22023', message = 'invalid_assignment_input';
  end if;

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

  select student.status
  into v_student_status
  from public.profiles as student
  where student.id = p_student_id
    and student.tenant_id = v_actor_tenant_id
    and student.role = 'user_personalized'
    and student.coach_id = (select auth.uid());

  if not found or v_student_status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'student_not_active_or_owned';
  end if;

  if p_assignment_id is null then
    insert into public.routine_assignments (
      tenant_id,
      coach_id,
      student_id,
      scheduled_for,
      title
    )
    values (
      v_actor_tenant_id,
      (select auth.uid()),
      p_student_id,
      p_scheduled_for,
      btrim(p_title)
    )
    returning id into v_assignment_id;
  else
    select assignment.*
    into v_assignment
    from public.routine_assignments as assignment
    where assignment.id = p_assignment_id
      and assignment.tenant_id = v_actor_tenant_id
      and assignment.coach_id = (select auth.uid())
    for update;

    if not found then
      raise exception using errcode = '42501', message = 'assignment_not_owned';
    end if;
    if v_assignment.status <> 'DRAFT' then
      raise exception using errcode = 'P0001', message = 'assignment_not_draft';
    end if;
    if v_assignment.student_id <> p_student_id then
      raise exception using errcode = '42501', message = 'assignment_student_immutable';
    end if;

    update public.routine_assignments as assignment
    set scheduled_for = p_scheduled_for,
        title = btrim(p_title)
    where assignment.id = p_assignment_id;

    delete from public.routine_assignment_items as item
    where item.assignment_id = p_assignment_id
      and item.tenant_id = v_actor_tenant_id;

    v_assignment_id := p_assignment_id;
  end if;

  v_position := 0;
  v_item_count := pg_catalog.jsonb_array_length(p_items);
  for v_item in select value from pg_catalog.jsonb_array_elements(p_items)
  loop
    if pg_catalog.jsonb_typeof(v_item) <> 'object'
      or pg_catalog.jsonb_typeof(v_item -> 'sourceType') <> 'string'
      or pg_catalog.jsonb_typeof(v_item -> 'sourceId') <> 'string'
      or pg_catalog.jsonb_typeof(v_item -> 'prescribedSets') <> 'number'
      or pg_catalog.jsonb_typeof(v_item -> 'prescribedReps') <> 'string'
      or pg_catalog.jsonb_typeof(v_item -> 'targetLoad') <> 'string'
      or pg_catalog.jsonb_typeof(v_item -> 'rest') <> 'string'
    then
      raise exception using errcode = '22023', message = 'invalid_assignment_item';
    end if;

    v_source_type := v_item ->> 'sourceType';
    begin
      v_source_id := (v_item ->> 'sourceId')::uuid;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'invalid_assignment_exercise_id';
    end;

    if v_source_type = 'catalog' then
      if not exists (
        select 1
        from public.exercise_catalog as exercise
        where exercise.id = v_source_id
          and exercise.archived_at is null
      ) then
        raise exception using errcode = '23503', message = 'routine_exercise_unavailable';
      end if;

      insert into public.routine_assignment_items (
        tenant_id,
        assignment_id,
        position,
        catalog_exercise_id,
        exercise_snapshot,
        prescribed_sets,
        prescribed_reps,
        target_load,
        work_duration,
        rest
      )
      values (
        v_actor_tenant_id,
        v_assignment_id,
        v_position,
        v_source_id,
        '{}'::jsonb,
        (v_item ->> 'prescribedSets')::smallint,
        btrim(v_item ->> 'prescribedReps'),
        btrim(v_item ->> 'targetLoad'),
        nullif(btrim(v_item ->> 'workDuration'), ''),
        btrim(v_item ->> 'rest')
      );
    elsif v_source_type = 'tenant' then
      if not exists (
        select 1
        from public.tenant_exercises as exercise
        where exercise.id = v_source_id
          and exercise.tenant_id = v_actor_tenant_id
          and exercise.archived_at is null
      ) then
        raise exception using errcode = '23503', message = 'routine_exercise_unavailable';
      end if;

      insert into public.routine_assignment_items (
        tenant_id,
        assignment_id,
        position,
        tenant_exercise_id,
        exercise_snapshot,
        prescribed_sets,
        prescribed_reps,
        target_load,
        work_duration,
        rest
      )
      values (
        v_actor_tenant_id,
        v_assignment_id,
        v_position,
        v_source_id,
        '{}'::jsonb,
        (v_item ->> 'prescribedSets')::smallint,
        btrim(v_item ->> 'prescribedReps'),
        btrim(v_item ->> 'targetLoad'),
        nullif(btrim(v_item ->> 'workDuration'), ''),
        btrim(v_item ->> 'rest')
      );
    else
      raise exception using errcode = '22023', message = 'invalid_assignment_exercise_source';
    end if;

    v_position := v_position + 1;
  end loop;

  return v_assignment_id;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'assignment_date_taken';
end;
$$;

revoke all on function public.save_routine_assignment_draft(uuid, uuid, date, text, jsonb)
  from public, anon;
grant execute on function public.save_routine_assignment_draft(uuid, uuid, date, text, jsonb)
  to authenticated;

comment on function public.save_routine_assignment_draft(uuid, uuid, date, text, jsonb) is
  'Atomically creates or replaces a coach-owned draft assignment and snapshots selected exercises.';