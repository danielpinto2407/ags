begin;

create or replace function private.enforce_cycle_iteration_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program_mode public.routine_program_mode;
  v_expected_attempt integer;
  v_max_attempts integer;
begin
  if new.slot_attempt is null then
    return new;
  end if;

  select assignment.program_mode, assignment.additional_cycle_repeats + 1
  into v_program_mode, v_max_attempts
  from public.routine_assignments as assignment
  where assignment.id = new.assignment_id
    and assignment.tenant_id = new.tenant_id;

  if not found or v_program_mode <> 'CYCLE' then
    return new;
  end if;

  if new.slot_attempt > v_max_attempts then
    raise exception using errcode = 'P0001', message = 'cycle_slot_attempts_exhausted';
  end if;

  select coalesce(pg_catalog.min(slot.terminal_attempts), 0)::integer + 1
  into v_expected_attempt
  from (
    select day.id,
      case
        when pg_catalog.count(execution.id) >= v_max_attempts then v_max_attempts
        else pg_catalog.count(execution.id) filter (
          where execution.status in ('COMPLETED', 'CLOSED_INCOMPLETE')
        )::integer
      end as terminal_attempts
    from public.routine_assignment_days as day
    left join public.routine_executions as execution
      on execution.cycle_day_id = day.id
      and execution.assignment_id = day.assignment_id
      and execution.tenant_id = day.tenant_id
    where day.assignment_id = new.assignment_id
      and day.tenant_id = new.tenant_id
    group by day.id
  ) as slot;

  if new.slot_attempt <> v_expected_attempt then
    raise exception using errcode = 'P0001', message = 'cycle_iteration_not_ready';
  end if;

  return new;
end;
$$;

comment on function private.enforce_cycle_iteration_order() is
  'Enforces global sequential cycle rounds. Exhausted slots report exhaustion before round-order checks; completed and closed-incomplete executions close a slot iteration.';

commit;
