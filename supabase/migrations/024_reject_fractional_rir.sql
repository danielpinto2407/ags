begin;

alter function public.save_routine_execution_performance(uuid, integer, uuid, jsonb, integer, numeric)
  rename to save_routine_execution_performance_integer;
revoke all on function public.save_routine_execution_performance_integer(uuid, integer, uuid, jsonb, integer, numeric)
  from public, anon, authenticated;

create function public.save_routine_execution_performance(
  p_assignment_id uuid,
  p_cycle_day_position integer,
  p_routine_item_id uuid,
  p_sets jsonb,
  p_rir numeric,
  p_rpe_percent numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_rir is not null and (p_rir <> pg_catalog.trunc(p_rir) or p_rir not between 1 and 10) then
    raise exception using errcode = '22023', message = 'invalid_actual_performance';
  end if;

  return public.save_routine_execution_performance_integer(
    p_assignment_id,
    p_cycle_day_position,
    p_routine_item_id,
    p_sets,
    p_rir::integer,
    p_rpe_percent
  );
end;
$$;

revoke all on function public.save_routine_execution_performance(uuid, integer, uuid, jsonb, numeric, numeric)
  from public, anon;
grant execute on function public.save_routine_execution_performance(uuid, integer, uuid, jsonb, numeric, numeric)
  to authenticated;

commit;
