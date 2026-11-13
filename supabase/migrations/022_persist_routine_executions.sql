begin;

create type public.routine_execution_status as enum ('IN_PROGRESS', 'COMPLETED', 'CLOSED_INCOMPLETE');

alter table public.routine_assignment_items
  add constraint routine_assignment_items_id_tenant_unique unique (id, tenant_id);

create table public.routine_executions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  tenant_id uuid not null,
  assignment_id uuid not null,
  cycle_day_id uuid not null,
  student_id uuid not null,
  execution_date date not null,
  slot_attempt integer,
  status public.routine_execution_status not null default 'IN_PROGRESS',
  started_at timestamptz not null default pg_catalog.now(),
  closed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint routine_executions_assignment_tenant_fk
    foreign key (assignment_id, tenant_id)
    references public.routine_assignments (id, tenant_id)
    on delete restrict,
  constraint routine_executions_cycle_day_assignment_fk
    foreign key (cycle_day_id, assignment_id)
    references public.routine_assignment_days (id, assignment_id)
    on delete restrict,
  constraint routine_executions_student_tenant_fk
    foreign key (student_id, tenant_id)
    references public.profiles (id, tenant_id)
    on delete restrict,
  constraint routine_executions_slot_attempt_check
    check (slot_attempt is null or slot_attempt >= 1),
  constraint routine_executions_closed_state_check
    check (
      (status = 'IN_PROGRESS' and closed_at is null)
      or (status in ('COMPLETED', 'CLOSED_INCOMPLETE') and closed_at is not null)
    ),
  constraint routine_executions_id_tenant_unique unique (id, tenant_id)
);

create unique index routine_executions_one_start_per_student_date
  on public.routine_executions (tenant_id, student_id, execution_date);
create unique index routine_executions_one_attempt_per_cycle_slot
  on public.routine_executions (cycle_day_id, slot_attempt)
  where slot_attempt is not null;
create index routine_executions_student_history_idx
  on public.routine_executions (tenant_id, student_id, execution_date desc);

create table public.routine_execution_sets (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  tenant_id uuid not null,
  execution_id uuid not null,
  routine_item_id uuid not null,
  set_number integer not null check (set_number >= 1),
  completed boolean not null default false,
  actual_repetitions integer,
  actual_load integer,
  load_unit text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint routine_execution_sets_execution_tenant_fk
    foreign key (execution_id, tenant_id)
    references public.routine_executions (id, tenant_id)
    on delete cascade,
  constraint routine_execution_sets_item_tenant_fk
    foreign key (routine_item_id, tenant_id)
    references public.routine_assignment_items (id, tenant_id)
    on delete restrict,
  constraint routine_execution_sets_repetitions_check
    check (actual_repetitions is null or actual_repetitions >= 0),
  constraint routine_execution_sets_load_check
    check (actual_load is null or actual_load >= 0),
  constraint routine_execution_sets_load_pair_check
    check ((actual_load is null and load_unit is null) or (actual_load is not null and load_unit in ('lbs', 'kg'))),
  constraint routine_execution_sets_completed_repetitions_check
    check (not completed or actual_repetitions is not null),
  constraint routine_execution_sets_execution_item_set_unique
    unique (execution_id, routine_item_id, set_number)
);

create table public.routine_execution_exercises (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  tenant_id uuid not null,
  execution_id uuid not null,
  routine_item_id uuid not null,
  rir smallint,
  rpe_percent numeric(5, 2),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint routine_execution_exercises_execution_tenant_fk
    foreign key (execution_id, tenant_id)
    references public.routine_executions (id, tenant_id)
    on delete cascade,
  constraint routine_execution_exercises_item_tenant_fk
    foreign key (routine_item_id, tenant_id)
    references public.routine_assignment_items (id, tenant_id)
    on delete restrict,
  constraint routine_execution_exercises_rir_check
    check (rir is null or rir between 1 and 10),
  constraint routine_execution_exercises_rpe_check
    check (rpe_percent is null or rpe_percent between 0 and 100),
  constraint routine_execution_exercises_execution_item_unique
    unique (execution_id, routine_item_id)
);

create trigger routine_executions_set_updated_at
  before update on public.routine_executions
  for each row execute function private.set_updated_at();
create trigger routine_execution_sets_set_updated_at
  before update on public.routine_execution_sets
  for each row execute function private.set_updated_at();
create trigger routine_execution_exercises_set_updated_at
  before update on public.routine_execution_exercises
  for each row execute function private.set_updated_at();

alter table public.routine_executions enable row level security;
alter table public.routine_execution_sets enable row level security;
alter table public.routine_execution_exercises enable row level security;
revoke all on table public.routine_executions from public, anon, authenticated;
revoke all on table public.routine_execution_sets from public, anon, authenticated;
revoke all on table public.routine_execution_exercises from public, anon, authenticated;
grant select on table public.routine_executions to authenticated;
grant select on table public.routine_execution_sets to authenticated;
grant select on table public.routine_execution_exercises to authenticated;
grant all on table public.routine_executions to service_role;
grant all on table public.routine_execution_sets to service_role;
grant all on table public.routine_execution_exercises to service_role;

create policy routine_executions_select_participant
  on public.routine_executions
  for select
  to authenticated
  using (
    (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
    and tenant_id = (select private.current_profile_tenant_id())
    and (
      (student_id = (select auth.uid()) and (select private.current_profile_role()) = 'user_personalized')
      or (
        (select private.current_profile_role()) = 'coach_admin'
        and exists (
          select 1 from public.profiles as student
          where student.id = routine_executions.student_id
            and student.tenant_id = routine_executions.tenant_id
            and student.coach_id = (select auth.uid())
        )
      )
    )
  );

create policy routine_execution_sets_select_participant
  on public.routine_execution_sets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.routine_executions as execution
      where execution.id = routine_execution_sets.execution_id
        and execution.tenant_id = routine_execution_sets.tenant_id
    )
  );

create policy routine_execution_exercises_select_participant
  on public.routine_execution_exercises
  for select
  to authenticated
  using (
    exists (
      select 1 from public.routine_executions as execution
      where execution.id = routine_execution_exercises.execution_id
        and execution.tenant_id = routine_execution_exercises.tenant_id
    )
  );

create function public.close_expired_routine_executions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_tenant_id uuid;
  v_actor_role public.app_role;
  v_actor_status public.profile_status;
  v_closed_count integer;
begin
  select profile.tenant_id, profile.role, profile.status
  into v_actor_tenant_id, v_actor_role, v_actor_status
  from public.profiles as profile
  where profile.id = (select auth.uid());

  if not found or v_actor_role <> 'user_personalized' or v_actor_status <> 'ACTIVE'
    or not (select private.current_profile_tenant_is_active())
  then
    raise exception using errcode = '42501', message = 'student_access_required';
  end if;

  update public.routine_executions as execution
  set status = 'CLOSED_INCOMPLETE', closed_at = pg_catalog.now()
  where execution.tenant_id = v_actor_tenant_id
    and execution.student_id = (select auth.uid())
    and execution.execution_date < (pg_catalog.timezone('UTC', pg_catalog.now()))::date
    and execution.status = 'IN_PROGRESS';

  get diagnostics v_closed_count = row_count;
  return v_closed_count;
end;
$$;

revoke all on function public.close_expired_routine_executions() from public, anon;
grant execute on function public.close_expired_routine_executions() to authenticated;

create function public.save_routine_execution_performance(
  p_assignment_id uuid,
  p_cycle_day_position integer,
  p_routine_item_id uuid,
  p_sets jsonb,
  p_rir integer,
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
  v_set jsonb;
  v_set_number integer;
  v_completed boolean;
  v_actual_repetitions integer;
  v_actual_load integer;
  v_load_unit text;
  v_total_sets integer;
  v_completed_sets integer;
  v_total_items integer;
  v_ready_items integer;
  v_prior_attempts integer;
  v_slot_attempt integer;
  v_today date := (pg_catalog.timezone('UTC', pg_catalog.now()))::date;
  v_has_completed_set boolean := false;
  v_seen_set_numbers integer[] := array[]::integer[];
  v_execution_id uuid;
  v_progress numeric;
  v_numeric_value numeric;
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

  if p_sets is null or pg_catalog.jsonb_typeof(p_sets) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_sets) < 1
    or (p_rir is not null and p_rir not between 1 and 10)
    or (p_rpe_percent is not null and p_rpe_percent not between 0 and 100)
  then
    raise exception using errcode = '22023', message = 'invalid_actual_performance';
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

  if p_sets is not null then
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
      if v_set_number < 1 or v_set_number > v_item.prescribed_sets then
        raise exception using errcode = '22023', message = 'actual_set_number_out_of_range';
      end if;
      if v_set_number = any(v_seen_set_numbers) then
        raise exception using errcode = '22023', message = 'duplicate_actual_set_number';
      end if;
      v_seen_set_numbers := pg_catalog.array_append(v_seen_set_numbers, v_set_number);

      v_completed := (v_set ->> 'completed')::boolean;
      v_actual_repetitions := null;
      if v_set -> 'actualRepetitions' is not null and v_set -> 'actualRepetitions' <> 'null'::jsonb then
        begin
          v_numeric_value := (v_set ->> 'actualRepetitions')::numeric;
        exception when invalid_text_representation or numeric_value_out_of_range then
          raise exception using errcode = '22023', message = 'invalid_actual_repetitions';
        end;
        if v_numeric_value <> pg_catalog.trunc(v_numeric_value) then
          raise exception using errcode = '22023', message = 'invalid_actual_repetitions';
        end if;
        v_actual_repetitions := v_numeric_value::integer;
        if v_actual_repetitions < 0 then
          raise exception using errcode = '22023', message = 'invalid_actual_repetitions';
        end if;
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
        if v_numeric_value <> pg_catalog.trunc(v_numeric_value) then
          raise exception using errcode = '22023', message = 'invalid_actual_load';
        end if;
        v_actual_load := v_numeric_value::integer;
        if v_actual_load < 0 then
          raise exception using errcode = '22023', message = 'invalid_actual_load';
        end if;
      end if;
      v_load_unit := nullif(v_set ->> 'loadUnit', '');
      if v_load_unit = 'null' then v_load_unit := null; end if;
      if (v_actual_load is null and v_load_unit is not null)
        or (v_actual_load is not null and v_load_unit not in ('lbs', 'kg'))
      then
        raise exception using errcode = '22023', message = 'invalid_actual_load_unit';
      end if;
      if v_completed and (v_item.base_load is not null or length(btrim(v_item.target_load)) > 0)
        and v_actual_load is null
      then
        raise exception using errcode = '22023', message = 'completed_weighted_set_requires_load';
      end if;
      if v_completed then v_has_completed_set := true; end if;
    end loop;
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
    if not v_has_completed_set then
      raise exception using errcode = 'P0001', message = 'first_completed_set_required';
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

  for v_set in select value from pg_catalog.jsonb_array_elements(p_sets)
  loop
    v_set_number := (v_set ->> 'setNumber')::integer;
    v_completed := (v_set ->> 'completed')::boolean;
    v_actual_repetitions := nullif(v_set ->> 'actualRepetitions', 'null')::integer;
    v_actual_load := nullif(v_set ->> 'actualLoad', 'null')::integer;
    v_load_unit := nullif(v_set ->> 'loadUnit', 'null');

    insert into public.routine_execution_sets (
      tenant_id, execution_id, routine_item_id, set_number,
      completed, actual_repetitions, actual_load, load_unit
    ) values (
      v_actor_tenant_id, v_execution_id, v_item.id, v_set_number,
      v_completed, v_actual_repetitions, v_actual_load, v_load_unit
    )
    on conflict (execution_id, routine_item_id, set_number)
    do update set completed = excluded.completed,
                  actual_repetitions = excluded.actual_repetitions,
                  actual_load = excluded.actual_load,
                  load_unit = excluded.load_unit;
  end loop;

  insert into public.routine_execution_exercises (
    tenant_id, execution_id, routine_item_id, rir, rpe_percent
  ) values (
    v_actor_tenant_id, v_execution_id, v_item.id, p_rir, p_rpe_percent
  )
  on conflict (execution_id, routine_item_id)
  do update set rir = excluded.rir, rpe_percent = excluded.rpe_percent;

  select coalesce(pg_catalog.sum(item.prescribed_sets), 0)::integer,
         pg_catalog.count(*)::integer
  into v_total_sets, v_total_items
  from public.routine_assignment_items as item
  where item.cycle_day_id = v_day.id
    and item.tenant_id = v_actor_tenant_id;

  select pg_catalog.count(*)::integer into v_completed_sets
  from public.routine_execution_sets as set_record
  where set_record.execution_id = v_execution_id
    and set_record.completed;

  select pg_catalog.count(*)::integer into v_ready_items
  from public.routine_assignment_items as item
  join public.routine_execution_exercises as effort
    on effort.execution_id = v_execution_id
    and effort.routine_item_id = item.id
  where item.cycle_day_id = v_day.id
    and item.tenant_id = v_actor_tenant_id
    and effort.rir is not null
    and effort.rpe_percent is not null
    and (
      select pg_catalog.count(*)
      from public.routine_execution_sets as set_record
      where set_record.execution_id = v_execution_id
        and set_record.routine_item_id = item.id
        and set_record.completed
    ) = item.prescribed_sets;

  v_progress := case when v_total_sets = 0 then 0 else (v_completed_sets::numeric / v_total_sets) * 100 end;
  if v_completed_sets = v_total_sets and v_ready_items = v_total_items then
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
    'completedSets', v_completed_sets,
    'prescribedSets', v_total_sets,
    'progressPercent', v_progress
  );
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'daily_execution_limit';
end;
$$;

revoke all on function public.save_routine_execution_performance(uuid, integer, uuid, jsonb, integer, numeric) from public, anon;
grant execute on function public.save_routine_execution_performance(uuid, integer, uuid, jsonb, integer, numeric) to authenticated;

comment on table public.routine_executions is
  'Student-started execution history. A row is created on the first completed actual set; date is UTC per product decision.';
comment on table public.routine_execution_sets is
  'Actual per-set performance, separate from the coach prescription. Progress derives from completed sets.';
comment on table public.routine_execution_exercises is
  'Per-exercise RIR and RPE captured by the student.';

commit;
