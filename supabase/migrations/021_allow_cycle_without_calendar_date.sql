begin;

alter table public.routine_assignments
  alter column scheduled_for drop not null;

create function private.validate_training_program_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day_count bigint;
  v_empty_day_count bigint;
  v_invalid_cycle_item_count bigint;
begin
  if new.status <> 'PUBLISHED' or old.status = 'PUBLISHED' then
    return new;
  end if;

  select pg_catalog.count(*)
  into v_day_count
  from public.routine_assignment_days as day
  where day.assignment_id = new.id
    and day.tenant_id = new.tenant_id;

  if v_day_count <> new.cycle_day_count
    or exists (
      select 1
      from public.routine_assignment_days as day
      where day.assignment_id = new.id
        and day.tenant_id = new.tenant_id
        and (day.position < 1 or day.position > new.cycle_day_count)
    )
  then
    raise exception using errcode = 'P0001', message = 'program_day_count_mismatch';
  end if;

  select pg_catalog.count(*)
  into v_empty_day_count
  from public.routine_assignment_days as day
  where day.assignment_id = new.id
    and day.tenant_id = new.tenant_id
    and not exists (
      select 1
      from public.routine_assignment_items as item
      where item.cycle_day_id = day.id
        and item.assignment_id = new.id
        and item.tenant_id = new.tenant_id
    );

  if v_empty_day_count > 0 then
    raise exception using errcode = 'P0001', message = 'assignment_has_no_exercises';
  end if;

  if new.program_mode = 'CYCLE' then
    select pg_catalog.count(*)
    into v_invalid_cycle_item_count
    from public.routine_assignment_items as item
    join public.routine_assignment_days as day
      on day.id = item.cycle_day_id
      and day.assignment_id = item.assignment_id
      and day.tenant_id = item.tenant_id
    where item.assignment_id = new.id
      and item.tenant_id = new.tenant_id
      and (item.base_repetitions is null or (item.base_load is not null and item.load_unit is null));

    if v_invalid_cycle_item_count > 0 then
      raise exception using errcode = 'P0001', message = 'cycle_progression_incomplete';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_training_program_publication() from public, anon, authenticated;

create trigger routine_assignments_validate_program_publication
  before update of status on public.routine_assignments
  for each row execute function private.validate_training_program_publication();

commit;
