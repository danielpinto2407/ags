begin;

alter table public.routine_assignment_items
  add column coach_instructions text,
  add constraint routine_assignment_items_coach_instructions_length_check
    check (coach_instructions is null or char_length(coach_instructions) <= 2000);

update public.routine_assignment_items
set coach_instructions = work_duration
where coach_instructions is null
  and work_duration is not null;

do $$
declare
  v_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.save_training_program_draft(uuid,uuid,text,date,text,integer,jsonb)'::pg_catalog.regprocedure
  ) into v_definition;

  v_definition := pg_catalog.replace(v_definition, 'work_duration', 'coach_instructions');
  v_definition := pg_catalog.replace(v_definition, 'workDuration', 'coachInstructions');
  execute v_definition;
end;
$$;

create function public.get_own_coach_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coach.full_name
  from public.profiles as student
  join public.profiles as coach
    on coach.id = student.coach_id
    and coach.tenant_id = student.tenant_id
    and coach.role = 'coach_admin'
  join public.tenants as tenant
    on tenant.id = student.tenant_id
    and tenant.status = 'ACTIVE'
  where student.id = (select auth.uid())
    and student.role = 'user_personalized'
    and student.status = 'ACTIVE'
  limit 1
$$;

revoke all on function public.get_own_coach_name() from public, anon;
grant execute on function public.get_own_coach_name() to authenticated;

comment on function public.get_own_coach_name() is
  'Returns only the authenticated personalized student profile linked coach name; no caller-supplied profile IDs are accepted.';

commit;
