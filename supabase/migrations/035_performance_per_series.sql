begin;

alter table public.routine_execution_sets
  add column rir smallint,
  add column rpe_percent numeric(5, 2),
  add constraint routine_execution_sets_rir_check
    check (rir is null or rir between 1 and 10),
  add constraint routine_execution_sets_rpe_check
    check (rpe_percent is null or rpe_percent between 0 and 100);

create function public.save_routine_exercise_performance_v2(
  p_assignment_id uuid,
  p_cycle_day_position integer,
  p_routine_item_id uuid,
  p_execution_id uuid,
  p_sets jsonb
)
returns jsonb
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
  v_day public.routine_assignment_days%rowtype;
  v_item public.routine_assignment_items%rowtype;
  v_execution public.routine_executions%rowtype;
  v_set jsonb;
  v_set_number integer;
  v_completed boolean;
  v_actual_repetitions integer;
  v_actual_load integer;
  v_load_unit text;
  v_rir smallint;
  v_rpe numeric(5, 2);
  v_numeric_value numeric;
  v_seen_set_numbers integer[] := array[]::integer[];
  v_has_completed_set boolean := false;
  v_execution_id uuid;
  v_slot_attempt integer;
  v_today date := (pg_catalog.timezone('UTC', pg_catalog.now()))::date;
  v_total_sets integer;
  v_completed_sets integer;
  v_completed_exercises integer;
  v_prescribed_exercises integer;
  v_status public.routine_execution_status;
  v_progress numeric;
begin
  select profile.tenant_id, profile.role, profile.status
  into v_actor_tenant_id, v_actor_role, v_actor_status
  from public.profiles as profile
  where profile.id = (select auth.uid());

  if not found or v_actor_role <> 'user_personalized' or v_actor_status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'student_access_required';
  end if;

  select tenant.status into v_tenant_status
  from public.tenants as tenant
  where tenant.id = v_actor_tenant_id;
  if not found or v_tenant_status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'gym_not_active';
  end if;

  if p_sets is null
    or pg_catalog.jsonb_typeof(p_sets) is distinct from 'array'
    or p_cycle_day_position is null
    or p_cycle_day_position < 1
  then
    raise exception using errcode = '22023', message = 'invalid_actual_sets';
  end if;

  update public.routine_executions as expired
  set status = 'CLOSED_INCOMPLETE', closed_at = pg_catalog.now()
  where expired.tenant_id = v_actor_tenant_id
    and expired.student_id = (select auth.uid())
    and expired.execution_date < v_today
    and expired.status = 'IN_PROGRESS';

  select assignment.* into v_assignment
  from public.routine_assignments as assignment
  where assignment.id = p_assignment_id
    and assignment.tenant_id = v_actor_tenant_id
    and assignment.student_id = (select auth.uid())
    and assignment.status = 'PUBLISHED'
  for share;
  if not found then
    raise exception using errcode = '42501', message = 'program_not_available';
  end if;

  select day.* into v_day
  from public.routine_assignment_days as day
  where day.assignment_id = v_assignment.id
    and day.tenant_id = v_actor_tenant_id
    and day.position = p_cycle_day_position;
  if not found then
    raise exception using errcode = '22023', message = 'program_day_not_found';
  end if;

  select item.* into v_item
  from public.routine_assignment_items as item
  where item.id = p_routine_item_id
    and item.assignment_id = v_assignment.id
    and item.cycle_day_id = v_day.id
    and item.tenant_id = v_actor_tenant_id;
  if not found then
    raise exception using errcode = '42501', message = 'routine_item_not_available';
  end if;

  if pg_catalog.jsonb_array_length(p_sets) <> v_item.prescribed_sets then
    raise exception using errcode = '22023', message = 'actual_set_count_mismatch';
  end if;

  if p_execution_id is not null then
    select execution.* into v_execution
    from public.routine_executions as execution
    where execution.id = p_execution_id
      and execution.tenant_id = v_actor_tenant_id
      and execution.assignment_id = v_assignment.id
      and execution.cycle_day_id = v_day.id
      and execution.student_id = (select auth.uid())
    for update;
    if not found then
      raise exception using errcode = '42501', message = 'execution_not_available';
    end if;
  end if;

  for v_set in select value from pg_catalog.jsonb_array_elements(p_sets)
  loop
    if pg_catalog.jsonb_typeof(v_set) <> 'object'
      or pg_catalog.jsonb_typeof(v_set -> 'setNumber') <> 'number'
      or pg_catalog.jsonb_typeof(v_set -> 'completed') <> 'boolean'
    then
      raise exception using errcode = '22023', message = 'invalid_actual_set';
    end if;

    begin
      v_numeric_value := (v_set ->> 'setNumber')::numeric;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception using errcode = '22023', message = 'invalid_actual_set_number';
    end;
    if v_numeric_value <> pg_catalog.trunc(v_numeric_value) then
      raise exception using errcode = '22023', message = 'invalid_actual_set_number';
    end if;
    v_set_number := v_numeric_value::integer;
    if v_set_number < 1 or v_set_number > v_item.prescribed_sets
      or v_set_number = any(v_seen_set_numbers)
    then
      raise exception using errcode = '22023', message = 'invalid_actual_set_number';
    end if;
    v_seen_set_numbers := pg_catalog.array_append(v_seen_set_numbers, v_set_number);

    v_completed := (v_set ->> 'completed')::boolean;
    if v_completed then v_has_completed_set := true; end if;

    v_actual_repetitions := null;
    if v_set -> 'actualRepetitions' is not null and v_set -> 'actualRepetitions' <> 'null'::jsonb then
      begin
        v_numeric_value := (v_set ->> 'actualRepetitions')::numeric;
      exception when invalid_text_representation or numeric_value_out_of_range then
        raise exception using errcode = '22023', message = 'invalid_actual_repetitions';
      end;
      if v_numeric_value <> pg_catalog.trunc(v_numeric_value) or v_numeric_value < 0 then
        raise exception using errcode = '22023', message = 'invalid_actual_repetitions';
      end if;
      v_actual_repetitions := v_numeric_value::integer;
    end if;
    if v_completed and v_actual_repetitions is null then
      raise exception using errcode = '22023', message = 'completed_set_requires_repetitions';
    end if;

    v_actual_load := null;
    if v_set -> 'actualLoad' is not null and v_set -> 'actualLoad' <> 'null'::jsonb then
      begin
        v_numeric_value := (v_set ->> 'actualLoad')::numeric;
      exception when invalid_text_representation or numeric_value_out_of_range then
        raise exception using errcode = '22023', message = 'invalid_actual_load';
      end;
      if v_numeric_value <> pg_catalog.trunc(v_numeric_value) or v_numeric_value < 0 then
        raise exception using errcode = '22023', message = 'invalid_actual_load';
      end if;
      v_actual_load := v_numeric_value::integer;
    end if;
    v_load_unit := nullif(v_set ->> 'loadUnit', '');
    if v_load_unit = 'null' then v_load_unit := null; end if;
    if (v_actual_load is null and v_load_unit is not null)
      or (v_actual_load is not null and v_load_unit not in ('lbs', 'kg'))
    then
      raise exception using errcode = '22023', message = 'invalid_actual_load_unit';
    end if;
    if v_completed
      and (v_item.base_load is not null or length(btrim(v_item.target_load)) > 0)
      and v_actual_load is null
    then
      raise exception using errcode = '22023', message = 'completed_weighted_set_requires_load';
    end if;

    v_rir := null;
    if v_set -> 'rir' is not null and v_set -> 'rir' <> 'null'::jsonb then
      begin
        v_numeric_value := (v_set ->> 'rir')::numeric;
      exception when invalid_text_representation or numeric_value_out_of_range then
        raise exception using errcode = '22023', message = 'invalid_actual_rir';
      end;
      if v_numeric_value <> pg_catalog.trunc(v_numeric_value) or v_numeric_value not between 1 and 10 then
        raise exception using errcode = '22023', message = 'invalid_actual_rir';
      end if;
      v_rir := v_numeric_value::smallint;
    end if;

    v_rpe := null;
    if v_set -> 'rpePercent' is not null and v_set -> 'rpePercent' <> 'null'::jsonb then
      begin
        v_numeric_value := (v_set ->> 'rpePercent')::numeric;
      exception when invalid_text_representation or numeric_value_out_of_range then
        raise exception using errcode = '22023', message = 'invalid_actual_rpe';
      end;
      if v_numeric_value not between 0 and 100 then
        raise exception using errcode = '22023', message = 'invalid_actual_rpe';
      end if;
      v_rpe := v_numeric_value::numeric(5, 2);
    end if;
    if v_completed and (v_rir is null or v_rpe is null) then
      raise exception using errcode = '22023', message = 'completed_set_requires_effort';
    end if;

    if p_execution_id is not null and v_execution.status <> 'IN_PROGRESS' then
      if exists (
        select 1
        from public.routine_execution_sets as old_set
        where old_set.execution_id = p_execution_id
          and old_set.routine_item_id = v_item.id
          and old_set.set_number = v_set_number
          and old_set.completed
          and not v_completed
      ) then
        raise exception using errcode = 'P0001', message = 'completed_set_cannot_uncheck';
      end if;
    end if;
  end loop;

  if pg_catalog.cardinality(v_seen_set_numbers) <> v_item.prescribed_sets then
    raise exception using errcode = '22023', message = 'invalid_actual_set_number';
  end if;

  if p_execution_id is not null then
    v_execution_id := v_execution.id;
  else
    select execution.* into v_execution
    from public.routine_executions as execution
    where execution.tenant_id = v_actor_tenant_id
      and execution.student_id = (select auth.uid())
      and execution.execution_date = v_today
    for update;

    if found then
      if v_execution.assignment_id <> v_assignment.id or v_execution.cycle_day_id <> v_day.id then
        raise exception using errcode = 'P0001', message = 'daily_execution_limit';
      end if;
      v_execution_id := v_execution.id;
    else
      if v_assignment.program_mode = 'SINGLE_DAY' then
        if v_assignment.scheduled_for <> v_today then
          raise exception using errcode = 'P0001', message = 'single_day_not_scheduled_today';
        end if;
      elsif exists (
        select 1 from public.routine_assignments as single_day
        where single_day.tenant_id = v_actor_tenant_id
          and single_day.student_id = (select auth.uid())
          and single_day.program_mode = 'SINGLE_DAY'
          and single_day.scheduled_for = v_today
          and single_day.status = 'PUBLISHED'
      ) then
        raise exception using errcode = 'P0001', message = 'single_day_program_takes_precedence';
      end if;

      if not v_has_completed_set then
        raise exception using errcode = 'P0001', message = 'first_completed_set_required';
      end if;

      if v_assignment.program_mode = 'CYCLE' then
        select pg_catalog.count(*)::integer into v_slot_attempt
        from public.routine_executions as execution
        where execution.cycle_day_id = v_day.id;
        v_slot_attempt := v_slot_attempt + 1;
        if v_slot_attempt > v_assignment.additional_cycle_repeats + 1 then
          raise exception using errcode = 'P0001', message = 'cycle_slot_attempts_exhausted';
        end if;
      else
        v_slot_attempt := null;
      end if;

      insert into public.routine_executions (
        tenant_id, assignment_id, cycle_day_id, student_id, execution_date, slot_attempt
      ) values (
        v_actor_tenant_id, v_assignment.id, v_day.id, (select auth.uid()), v_today, v_slot_attempt
      ) returning * into v_execution;
      v_execution_id := v_execution.id;
    end if;
  end if;

  for v_set in select value from pg_catalog.jsonb_array_elements(p_sets)
  loop
    v_set_number := (v_set ->> 'setNumber')::integer;
    v_completed := (v_set ->> 'completed')::boolean;
    v_actual_repetitions := nullif(v_set ->> 'actualRepetitions', 'null')::integer;
    v_actual_load := nullif(v_set ->> 'actualLoad', 'null')::integer;
    v_load_unit := nullif(v_set ->> 'loadUnit', 'null');
    v_rir := nullif(v_set ->> 'rir', 'null')::smallint;
    v_rpe := nullif(v_set ->> 'rpePercent', 'null')::numeric(5, 2);

    insert into public.routine_execution_sets (
      tenant_id, execution_id, routine_item_id, set_number,
      completed, actual_repetitions, actual_load, load_unit, rir, rpe_percent
    ) values (
      v_actor_tenant_id, v_execution_id, v_item.id, v_set_number,
      v_completed, v_actual_repetitions, v_actual_load, v_load_unit, v_rir, v_rpe
    )
    on conflict (execution_id, routine_item_id, set_number)
    do update set completed = excluded.completed,
                  actual_repetitions = excluded.actual_repetitions,
                  actual_load = excluded.actual_load,
                  load_unit = excluded.load_unit,
                  rir = excluded.rir,
                  rpe_percent = excluded.rpe_percent;
  end loop;

  delete from public.routine_execution_exercises as legacy
  where legacy.execution_id = v_execution_id
    and legacy.routine_item_id = v_item.id;

  select coalesce(pg_catalog.sum(item.prescribed_sets), 0)::integer,
         pg_catalog.count(*)::integer
  into v_total_sets, v_prescribed_exercises
  from public.routine_assignment_items as item
  where item.cycle_day_id = v_day.id
    and item.tenant_id = v_actor_tenant_id;

  select pg_catalog.count(*)::integer into v_completed_sets
  from public.routine_execution_sets as set_record
  where set_record.execution_id = v_execution_id
    and set_record.completed;

  select pg_catalog.count(*)::integer into v_completed_exercises
  from public.routine_assignment_items as item
  where item.cycle_day_id = v_day.id
    and item.tenant_id = v_actor_tenant_id
    and (
      select pg_catalog.count(*)
      from public.routine_execution_sets as set_record
      where set_record.execution_id = v_execution_id
        and set_record.routine_item_id = item.id
        and set_record.completed
    ) = item.prescribed_sets;

  if v_execution.status = 'IN_PROGRESS' and v_completed_sets = v_total_sets then
    update public.routine_executions as execution
    set status = 'COMPLETED', closed_at = pg_catalog.now()
    where execution.id = v_execution_id
    returning execution.status into v_status;
  else
    v_status := v_execution.status;
  end if;

  v_progress := case when v_total_sets = 0 then 0 else (v_completed_sets::numeric / v_total_sets) * 100 end;

  return pg_catalog.jsonb_build_object(
    'executionId', v_execution_id,
    'status', v_status,
    'progressPercent', v_progress,
    'completedSets', v_completed_sets,
    'prescribedSets', v_total_sets,
    'completedExercises', v_completed_exercises,
    'prescribedExercises', v_prescribed_exercises
  );
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'daily_execution_limit';
end;
$$;

revoke all on function public.save_routine_exercise_performance_v2(uuid, integer, uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_routine_exercise_performance_v2(uuid, integer, uuid, uuid, jsonb) to authenticated;

comment on column public.routine_execution_sets.rir is
  'Student-reported RIR for this actual performed set.';
comment on column public.routine_execution_sets.rpe_percent is
  'Student-reported RPE percentage for this actual performed set.';
comment on table public.routine_execution_sets is
  'Current per-series performance. Rows can be corrected by their student; completed sets cannot be unchecked, and closed execution status/cycle progression do not change.';

commit;
