begin;

create type public.routine_program_mode as enum ('SINGLE_DAY', 'CYCLE');

alter table public.routine_assignments
  add column program_mode public.routine_program_mode not null default 'SINGLE_DAY',
  add column additional_cycle_repeats integer not null default 0,
  add column cycle_day_count integer not null default 1,
  add constraint routine_assignments_cycle_repeat_count_check
    check (additional_cycle_repeats >= 0),
  add constraint routine_assignments_cycle_day_count_check
    check (cycle_day_count >= 1),
  add constraint routine_assignments_mode_date_check
    check (
      (program_mode = 'SINGLE_DAY' and scheduled_for is not null and additional_cycle_repeats = 0 and cycle_day_count = 1)
      or (program_mode = 'CYCLE' and scheduled_for is null)
    );

alter table public.routine_assignments
  drop constraint routine_assignments_one_per_student_date;

create unique index routine_assignments_one_single_day_per_student_date
  on public.routine_assignments (tenant_id, student_id, scheduled_for)
  where program_mode = 'SINGLE_DAY';

create table public.routine_assignment_days (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  tenant_id uuid not null,
  assignment_id uuid not null,
  position integer not null check (position >= 1),
  title text not null default 'Rutina'
    check (length(btrim(title)) between 1 and 120),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint routine_assignment_days_assignment_tenant_fk
    foreign key (assignment_id, tenant_id)
    references public.routine_assignments (id, tenant_id)
    on delete cascade,
  constraint routine_assignment_days_id_assignment_unique unique (id, assignment_id),
  constraint routine_assignment_days_position_unique unique (assignment_id, position)
);

insert into public.routine_assignment_days (tenant_id, assignment_id, position, title)
select tenant_id, id, 1, title
from public.routine_assignments;

alter table public.routine_assignment_items
  add column cycle_day_id uuid,
  add column base_repetitions integer,
  add column repetitions_increment integer not null default 0,
  add column base_load integer,
  add column load_increment integer not null default 0,
  add column load_unit text,
  add constraint routine_assignment_items_cycle_day_fk
    foreign key (cycle_day_id, assignment_id)
    references public.routine_assignment_days (id, assignment_id)
    on delete cascade,
  add constraint routine_assignment_items_cycle_repetitions_check
    check (base_repetitions is null or base_repetitions between 1 and 1000),
  add constraint routine_assignment_items_cycle_load_check
    check (base_load is null or base_load >= 0),
  add constraint routine_assignment_items_cycle_load_unit_check
    check (load_unit is null or load_unit in ('lbs', 'kg')),
  add constraint routine_assignment_items_cycle_load_pair_check
    check ((base_load is null and load_unit is null) or (base_load is not null and load_unit is not null));

update public.routine_assignment_items as item
set cycle_day_id = day.id
from public.routine_assignment_days as day
where day.assignment_id = item.assignment_id
  and day.position = 1;

alter table public.routine_assignment_items
  alter column cycle_day_id set not null,
  drop constraint routine_assignment_items_position_unique,
  add constraint routine_assignment_items_day_position_unique unique (cycle_day_id, position);

create index routine_assignment_days_program_position_idx
  on public.routine_assignment_days (tenant_id, assignment_id, position);

create trigger routine_assignment_days_set_updated_at
  before update on public.routine_assignment_days
  for each row execute function private.set_updated_at();

create function private.create_single_day_assignment_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.program_mode = 'SINGLE_DAY' then
    insert into public.routine_assignment_days (tenant_id, assignment_id, position, title)
    values (new.tenant_id, new.id, 1, new.title);
  end if;
  return new;
end;
$$;

revoke all on function private.create_single_day_assignment_slot() from public, anon, authenticated;

create trigger routine_assignments_create_single_day_slot
  after insert on public.routine_assignments
  for each row execute function private.create_single_day_assignment_slot();

create function private.assign_default_single_day_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cycle_day_id is null then
    select day.id
    into new.cycle_day_id
    from public.routine_assignment_days as day
    where day.assignment_id = new.assignment_id
      and day.position = 1;

    if new.cycle_day_id is null then
      raise exception using errcode = '23503', message = 'routine_program_day_missing';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.assign_default_single_day_slot() from public, anon, authenticated;

create trigger routine_assignment_items_default_single_day_slot
  before insert on public.routine_assignment_items
  for each row execute function private.assign_default_single_day_slot();

alter table public.routine_assignment_days enable row level security;
revoke all on table public.routine_assignment_days from public, anon, authenticated;
grant select on table public.routine_assignment_days to authenticated;
grant all on table public.routine_assignment_days to service_role;

create policy routine_assignment_days_select_visible_assignment
  on public.routine_assignment_days
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.routine_assignments as assignment
      where assignment.id = routine_assignment_days.assignment_id
        and assignment.tenant_id = routine_assignment_days.tenant_id
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

create policy routine_assignment_days_insert_owned_draft
  on public.routine_assignment_days
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.routine_assignments as assignment
      where assignment.id = routine_assignment_days.assignment_id
        and assignment.tenant_id = routine_assignment_days.tenant_id
        and assignment.status = 'DRAFT'
        and assignment.coach_id = (select auth.uid())
        and assignment.tenant_id = (select private.current_profile_tenant_id())
        and (select private.current_profile_role()) = 'coach_admin'
        and (select private.current_profile_is_active())
        and (select private.current_profile_tenant_is_active())
    )
  );

create policy routine_assignment_days_update_owned_draft
  on public.routine_assignment_days
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.routine_assignments as assignment
      where assignment.id = routine_assignment_days.assignment_id
        and assignment.tenant_id = routine_assignment_days.tenant_id
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
      where assignment.id = routine_assignment_days.assignment_id
        and assignment.tenant_id = routine_assignment_days.tenant_id
        and assignment.status = 'DRAFT'
        and assignment.coach_id = (select auth.uid())
        and assignment.tenant_id = (select private.current_profile_tenant_id())
        and (select private.current_profile_role()) = 'coach_admin'
        and (select private.current_profile_is_active())
        and (select private.current_profile_tenant_is_active())
    )
  );

create policy routine_assignment_days_delete_owned_draft
  on public.routine_assignment_days
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

create function public.save_training_program_draft(
  p_assignment_id uuid,
  p_student_id uuid,
  p_program_mode text,
  p_scheduled_for date,
  p_title text,
  p_additional_cycle_repeats integer,
  p_cycle_days jsonb
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
  v_day jsonb;
  v_item jsonb;
  v_day_id uuid;
  v_day_position integer;
  v_item_position integer;
  v_source_id uuid;
  v_source_type text;
  v_day_count integer;
  v_item_count integer;
begin
  if p_program_mode is null
    or p_program_mode not in ('SINGLE_DAY', 'CYCLE')
    or p_title is null
    or length(btrim(p_title)) not between 1 and 120
    or p_cycle_days is null
    or pg_catalog.jsonb_typeof(p_cycle_days) <> 'array'
    or pg_catalog.jsonb_array_length(p_cycle_days) < 1
    or p_additional_cycle_repeats is null
    or p_additional_cycle_repeats < 0
    or (p_program_mode = 'SINGLE_DAY' and (p_scheduled_for is null or p_additional_cycle_repeats <> 0 or pg_catalog.jsonb_array_length(p_cycle_days) <> 1))
    or (p_program_mode = 'CYCLE' and p_scheduled_for is not null)
  then
    raise exception using errcode = '22023', message = 'invalid_training_program_input';
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

  v_day_count := pg_catalog.jsonb_array_length(p_cycle_days);
  if p_program_mode = 'SINGLE_DAY' then
    v_day_count := 1;
  end if;

  if p_assignment_id is null then
    insert into public.routine_assignments (
      tenant_id, coach_id, student_id, scheduled_for, title, program_mode,
      additional_cycle_repeats, cycle_day_count
    )
    values (
      v_actor_tenant_id, (select auth.uid()), p_student_id, p_scheduled_for,
      btrim(p_title), p_program_mode::public.routine_program_mode,
      p_additional_cycle_repeats, v_day_count
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
        title = btrim(p_title),
        program_mode = p_program_mode::public.routine_program_mode,
        additional_cycle_repeats = p_additional_cycle_repeats,
        cycle_day_count = v_day_count
    where assignment.id = p_assignment_id;

    delete from public.routine_assignment_days as day
    where day.assignment_id = p_assignment_id;
    v_assignment_id := p_assignment_id;
  end if;

  v_day_position := 0;
  for v_day in select value from pg_catalog.jsonb_array_elements(p_cycle_days)
  loop
    v_day_position := v_day_position + 1;
    if pg_catalog.jsonb_typeof(v_day) <> 'object'
      or pg_catalog.jsonb_typeof(v_day -> 'items') <> 'array'
      or (v_day ->> 'position')::integer is distinct from v_day_position
      or length(btrim(coalesce(v_day ->> 'title', ''))) not between 1 and 120
      or pg_catalog.jsonb_array_length(v_day -> 'items') > 50
      or (p_program_mode = 'SINGLE_DAY' and v_day_position <> 1)
    then
      raise exception using errcode = '22023', message = 'invalid_training_program_day';
    end if;

    if p_assignment_id is null and p_program_mode = 'SINGLE_DAY' then
      update public.routine_assignment_days as day
      set title = btrim(v_day ->> 'title')
      where day.assignment_id = v_assignment_id
        and day.position = 1
      returning day.id into v_day_id;
    else
      insert into public.routine_assignment_days (tenant_id, assignment_id, position, title)
      values (v_actor_tenant_id, v_assignment_id, v_day_position, btrim(v_day ->> 'title'))
      returning id into v_day_id;
    end if;

    v_item_position := 0;
    v_item_count := pg_catalog.jsonb_array_length(v_day -> 'items');
    for v_item in select value from pg_catalog.jsonb_array_elements(v_day -> 'items')
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
          select 1 from public.exercise_catalog as exercise
          where exercise.id = v_source_id and exercise.archived_at is null
        ) then
          raise exception using errcode = '23503', message = 'routine_exercise_unavailable';
        end if;
      elsif v_source_type = 'tenant' then
        if not exists (
          select 1 from public.tenant_exercises as exercise
          where exercise.id = v_source_id and exercise.tenant_id = v_actor_tenant_id and exercise.archived_at is null
        ) then
          raise exception using errcode = '23503', message = 'routine_exercise_unavailable';
        end if;
      else
        raise exception using errcode = '22023', message = 'invalid_assignment_exercise_source';
      end if;

      insert into public.routine_assignment_items (
        tenant_id, assignment_id, cycle_day_id, position,
        catalog_exercise_id, tenant_exercise_id, exercise_snapshot,
        prescribed_sets, prescribed_reps, target_load, work_duration, rest,
        base_repetitions, repetitions_increment, base_load, load_increment, load_unit
      )
      values (
        v_actor_tenant_id, v_assignment_id, v_day_id, v_item_position,
        case when v_source_type = 'catalog' then v_source_id else null end,
        case when v_source_type = 'tenant' then v_source_id else null end,
        '{}'::jsonb,
        (v_item ->> 'prescribedSets')::smallint,
        btrim(v_item ->> 'prescribedReps'),
        btrim(v_item ->> 'targetLoad'),
        nullif(btrim(coalesce(v_item ->> 'workDuration', '')), ''),
        btrim(v_item ->> 'rest'),
        nullif(v_item ->> 'baseRepetitions', '')::integer,
        coalesce(nullif(v_item ->> 'repetitionsIncrement', '')::integer, 0),
        nullif(v_item ->> 'baseLoad', '')::integer,
        coalesce(nullif(v_item ->> 'loadIncrement', '')::integer, 0),
        nullif(v_item ->> 'loadUnit', '')
      );
      v_item_position := v_item_position + 1;
    end loop;
  end loop;

  return v_assignment_id;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'assignment_date_taken';
end;
$$;

revoke all on function public.save_training_program_draft(uuid, uuid, text, date, text, integer, jsonb) from public, anon;
grant execute on function public.save_training_program_draft(uuid, uuid, text, date, text, integer, jsonb) to authenticated;

create function public.publish_training_program(p_assignment_id uuid)
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
  v_day_count bigint;
  v_empty_day_count bigint;
  v_invalid_cycle_item_count bigint;
begin
  select p.tenant_id, p.role, p.status
  into v_actor_tenant_id, v_actor_role, v_actor_status
  from public.profiles as p
  where p.id = (select auth.uid());

  if not found or v_actor_role <> 'coach_admin' or v_actor_status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'coach_access_required';
  end if;

  select t.status into v_tenant_status
  from public.tenants as t where t.id = v_actor_tenant_id;
  if not found or v_tenant_status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'gym_not_active';
  end if;

  select assignment.* into v_assignment
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

  select student.status into v_student_status
  from public.profiles as student
  where student.id = v_assignment.student_id
    and student.tenant_id = v_assignment.tenant_id
    and student.role = 'user_personalized'
    and student.coach_id = (select auth.uid());
  if not found or v_student_status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'student_not_active_or_owned';
  end if;

  select pg_catalog.count(*) into v_day_count
  from public.routine_assignment_days as day
  where day.assignment_id = v_assignment.id;
  if v_day_count <> v_assignment.cycle_day_count then
    raise exception using errcode = 'P0001', message = 'program_day_count_mismatch';
  end if;

  select pg_catalog.count(*) into v_empty_day_count
  from public.routine_assignment_days as day
  where day.assignment_id = v_assignment.id
    and not exists (
      select 1 from public.routine_assignment_items as item
      where item.cycle_day_id = day.id and item.tenant_id = day.tenant_id
    );
  if v_empty_day_count > 0 then
    raise exception using errcode = 'P0001', message = 'assignment_has_no_exercises';
  end if;

  if v_assignment.program_mode = 'CYCLE' then
    select pg_catalog.count(*) into v_invalid_cycle_item_count
    from public.routine_assignment_items as item
    join public.routine_assignment_days as day on day.id = item.cycle_day_id
    where day.assignment_id = v_assignment.id
      and (item.base_repetitions is null or (item.base_load is not null and item.load_unit is null));
    if v_invalid_cycle_item_count > 0 then
      raise exception using errcode = 'P0001', message = 'cycle_progression_incomplete';
    end if;
  end if;

  update public.routine_assignments as assignment
  set status = 'PUBLISHED', published_at = pg_catalog.now()
  where assignment.id = v_assignment.id;
  return v_assignment.id;
end;
$$;

revoke all on function public.publish_training_program(uuid) from public, anon;
grant execute on function public.publish_training_program(uuid) to authenticated;

comment on table public.routine_assignments is
  'Unified personalized training program root. Existing rows are backfilled as SINGLE_DAY; CYCLE uses ordered routine_assignment_days.';
comment on table public.routine_assignment_days is
  'Ordered routine slots within a SINGLE_DAY or CYCLE program. Position is an ordinal slot, not a calendar date.';

commit;
