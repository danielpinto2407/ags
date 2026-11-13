begin;

alter table public.routine_execution_exercises
  add column completed boolean not null default false,
  add column actual_repetitions integer,
  add column actual_load integer,
  add column load_unit text,
  add constraint routine_execution_exercises_repetitions_check
    check (actual_repetitions is null or actual_repetitions >= 0),
  add constraint routine_execution_exercises_load_check
    check (actual_load is null or actual_load >= 0),
  add constraint routine_execution_exercises_load_pair_check
    check ((actual_load is null and load_unit is null) or (actual_load is not null and load_unit in ('lbs', 'kg'))),
  add constraint routine_execution_exercises_completed_repetitions_check
    check (not completed or actual_repetitions is not null);

update public.routine_execution_exercises as performance
set completed = (
      select pg_catalog.count(*)
      from public.routine_execution_sets as set_record
      where set_record.execution_id = performance.execution_id
        and set_record.routine_item_id = performance.routine_item_id
        and set_record.completed
    ) >= (
      select item.prescribed_sets
      from public.routine_assignment_items as item
      where item.id = performance.routine_item_id
        and item.tenant_id = performance.tenant_id
    ),
    actual_repetitions = (
      select set_record.actual_repetitions
      from public.routine_execution_sets as set_record
      where set_record.execution_id = performance.execution_id
        and set_record.routine_item_id = performance.routine_item_id
      order by set_record.set_number desc
      limit 1
    ),
    actual_load = (
      select set_record.actual_load
      from public.routine_execution_sets as set_record
      where set_record.execution_id = performance.execution_id
        and set_record.routine_item_id = performance.routine_item_id
      order by set_record.set_number desc
      limit 1
    ),
    load_unit = (
      select set_record.load_unit
      from public.routine_execution_sets as set_record
      where set_record.execution_id = performance.execution_id
        and set_record.routine_item_id = performance.routine_item_id
      order by set_record.set_number desc
      limit 1
    )
where exists (
  select 1
  from public.routine_execution_sets as set_record
  where set_record.execution_id = performance.execution_id
    and set_record.routine_item_id = performance.routine_item_id
);

-- Remove the per-set write RPCs so new clients cannot persist a different execution model.
drop function public.save_routine_execution_performance(uuid, integer, uuid, jsonb, numeric, numeric);
drop function public.save_routine_execution_performance_integer(uuid, integer, uuid, jsonb, integer, numeric);

create function public.save_routine_exercise_performance(
  p_assignment_id uuid,
  p_cycle_day_position integer,
  p_routine_item_id uuid,
  p_completed boolean,
  p_actual_repetitions integer,
  p_actual_load integer,
  p_load_unit text,
  p_rir numeric,
  p_rpe_percent numeric
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
  v_total_exercises integer;
  v_completed_exercises integer;
  v_ready_exercises integer;
  v_prior_attempts integer;
  v_slot_attempt integer;
  v_today date := (pg_catalog.timezone('UTC', pg_catalog.now()))::date;
  v_execution_id uuid;
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
  from public.tenants as tenant where tenant.id = v_actor_tenant_id;
  if not found or v_tenant_status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'gym_not_active';
  end if;

  if p_completed is null
    or (p_actual_repetitions is not null and p_actual_repetitions < 0)
    or (p_actual_load is not null and p_actual_load < 0)
    or (p_actual_load is null and p_load_unit is not null)
    or (p_actual_load is not null and p_load_unit not in ('lbs', 'kg'))
    or (p_rir is not null and (p_rir <> pg_catalog.trunc(p_rir) or p_rir not between 1 and 10))
    or (p_rpe_percent is not null and p_rpe_percent not between 0 and 100)
  then
    raise exception using errcode = '22023', message = 'invalid_actual_performance';
  end if;
  if p_completed and p_actual_repetitions is null then
    raise exception using errcode = '22023', message = 'completed_exercise_requires_repetitions';
  end if;

  update public.routine_executions as execution
  set status = 'CLOSED_INCOMPLETE', closed_at = pg_catalog.now()
  where execution.tenant_id = v_actor_tenant_id
    and execution.student_id = (select auth.uid())
    and execution.execution_date < v_today
    and execution.status = 'IN_PROGRESS';

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

  if p_cycle_day_position is null or p_cycle_day_position < 1 then
    raise exception using errcode = '22023', message = 'invalid_program_day';
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
  if p_completed
    and (v_item.base_load is not null or length(btrim(v_item.target_load)) > 0)
    and p_actual_load is null
  then
    raise exception using errcode = '22023', message = 'completed_weighted_exercise_requires_load';
  end if;

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
    if v_execution.status <> 'IN_PROGRESS' then
      raise exception using errcode = 'P0001', message = 'execution_not_editable';
    end if;
    v_execution_id := v_execution.id;
  else
    if not p_completed then
      raise exception using errcode = 'P0001', message = 'first_completed_exercise_required';
    end if;

    if v_assignment.program_mode = 'CYCLE' then
      select pg_catalog.count(*)::integer into v_prior_attempts
      from public.routine_executions as execution
      where execution.cycle_day_id = v_day.id;
      v_slot_attempt := v_prior_attempts + 1;
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
    ) returning id into v_execution_id;
  end if;

  insert into public.routine_execution_exercises (
    tenant_id, execution_id, routine_item_id, completed,
    actual_repetitions, actual_load, load_unit, rir, rpe_percent
  ) values (
    v_actor_tenant_id, v_execution_id, v_item.id, p_completed,
    p_actual_repetitions, p_actual_load, p_load_unit, p_rir::smallint, p_rpe_percent
  )
  on conflict (execution_id, routine_item_id)
  do update set completed = excluded.completed,
                actual_repetitions = excluded.actual_repetitions,
                actual_load = excluded.actual_load,
                load_unit = excluded.load_unit,
                rir = excluded.rir,
                rpe_percent = excluded.rpe_percent;

  select pg_catalog.count(*)::integer into v_total_exercises
  from public.routine_assignment_items as item
  where item.cycle_day_id = v_day.id
    and item.tenant_id = v_actor_tenant_id;

  select pg_catalog.count(*)::integer into v_completed_exercises
  from public.routine_execution_exercises as performance
  where performance.execution_id = v_execution_id
    and performance.completed;

  select pg_catalog.count(*)::integer into v_ready_exercises
  from public.routine_execution_exercises as performance
  join public.routine_assignment_items as item
    on item.id = performance.routine_item_id
   and item.tenant_id = performance.tenant_id
  where performance.execution_id = v_execution_id
    and performance.completed
    and performance.rir is not null
    and performance.rpe_percent is not null;

  v_progress := case when v_total_exercises = 0 then 0 else (v_completed_exercises::numeric / v_total_exercises) * 100 end;
  if v_completed_exercises = v_total_exercises and v_ready_exercises = v_total_exercises then
    update public.routine_executions as execution
    set status = 'COMPLETED', closed_at = pg_catalog.now()
    where execution.id = v_execution_id;
  end if;

  select execution.* into v_execution
  from public.routine_executions as execution
  where execution.id = v_execution_id;

  return pg_catalog.jsonb_build_object(
    'executionId', v_execution.id,
    'status', v_execution.status,
    'executionDate', v_execution.execution_date,
    'slotAttempt', v_execution.slot_attempt,
    'completedExercises', v_completed_exercises,
    'prescribedExercises', v_total_exercises,
    'progressPercent', v_progress
  );
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'daily_execution_limit';
end;
$$;

revoke all on function public.save_routine_exercise_performance(uuid, integer, uuid, boolean, integer, integer, text, numeric, numeric) from public, anon;
grant execute on function public.save_routine_exercise_performance(uuid, integer, uuid, boolean, integer, integer, text, numeric, numeric) to authenticated;

comment on table public.routine_execution_exercises is
  'One actual reps/load/completion record per routine exercise, with one RIR/RPE pair; progress derives from completed exercises.';

commit;
