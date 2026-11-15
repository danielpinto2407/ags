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
begin
  if new.slot_attempt is null then
    return new;
  end if;

  select assignment.program_mode
  into v_program_mode
  from public.routine_assignments as assignment
  where assignment.id = new.assignment_id
    and assignment.tenant_id = new.tenant_id;

  if not found or v_program_mode <> 'CYCLE' then
    return new;
  end if;

  select coalesce(pg_catalog.min(slot.terminal_attempts), 0)::integer + 1
  into v_expected_attempt
  from (
    select day.id,
      pg_catalog.count(execution.id) filter (
        where execution.status in ('COMPLETED', 'CLOSED_INCOMPLETE')
      )::integer as terminal_attempts
    from public.routine_assignment_days as day
    join public.routine_assignments as assignment
      on assignment.id = day.assignment_id
      and assignment.tenant_id = day.tenant_id
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

revoke all on function private.enforce_cycle_iteration_order() from public, anon, authenticated;

drop trigger if exists routine_executions_enforce_cycle_iteration_order on public.routine_executions;

create trigger routine_executions_enforce_cycle_iteration_order
  before insert on public.routine_executions
  for each row execute function private.enforce_cycle_iteration_order();

comment on function private.enforce_cycle_iteration_order() is
  'Enforces sequential cycle rounds: each ordinal slot must have a completed or closed-incomplete result for the prior round before the next round starts.';

commit;