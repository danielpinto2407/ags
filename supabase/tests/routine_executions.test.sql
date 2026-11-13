begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(31);

insert into public.tenants (id, name, subdomain, status)
values ('e0000000-0000-4000-8000-000000000001', 'Execution Gym', 'execution-gym', 'ACTIVE');

insert into auth.users (id, email)
values
  ('e1000000-0000-4000-8000-000000000001', 'execution-coach@example.test'),
  ('e1000000-0000-4000-8000-000000000002', 'execution-student-a@example.test'),
  ('e1000000-0000-4000-8000-000000000003', 'execution-student-b@example.test'),
  ('e1000000-0000-4000-8000-000000000004', 'execution-student-c@example.test');

insert into public.profiles (id, tenant_id, role, status, full_name, coach_id)
values
  ('e1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Execution Coach', null),
  ('e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Execution Student A', 'e1000000-0000-4000-8000-000000000001'),
  ('e1000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Execution Student B', 'e1000000-0000-4000-8000-000000000001'),
  ('e1000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Execution Student C', 'e1000000-0000-4000-8000-000000000001');

select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.routine_executions'::pg_catalog.regclass),
  'RLS is enabled on routine executions'
);
select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.routine_execution_sets'::pg_catalog.regclass),
  'RLS is enabled on actual set records'
);
select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.routine_execution_exercises'::pg_catalog.regclass),
  'RLS is enabled on per-exercise effort records'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);

select extensions.is(
  public.save_training_program_draft(
    null, 'e1000000-0000-4000-8000-000000000002', 'SINGLE_DAY', (pg_catalog.timezone('UTC', pg_catalog.now()))::date,
    'Hoy', 0,
    '[{"position":1,"title":"Rutina de hoy","items":[{"sourceType":"catalog","sourceId":"b2000000-0000-4000-8000-000000000001","prescribedSets":2,"prescribedReps":"10","targetLoad":"40 kg","rest":"60 s"}]}]'::jsonb
  ) is not null,
  true,
  'coach can publish a single-day program for the current UTC date'
);
select extensions.is(
  public.publish_training_program((select id from public.routine_assignments where title = 'Hoy')),
  (select id from public.routine_assignments where title = 'Hoy'),
  'coach publishes the single-day program'
);

select extensions.is(
  public.save_training_program_draft(
    null, 'e1000000-0000-4000-8000-000000000002', 'CYCLE', null, 'Ciclo A', 1,
    '[
      {"position":1,"title":"Día A","items":[{"sourceType":"catalog","sourceId":"b2000000-0000-4000-8000-000000000001","prescribedSets":2,"prescribedReps":"8","targetLoad":"40 kg","rest":"90 s","baseRepetitions":8,"repetitionsIncrement":1,"baseLoad":40,"loadIncrement":5,"loadUnit":"kg"}]},
      {"position":2,"title":"Día B","items":[{"sourceType":"catalog","sourceId":"b2000000-0000-4000-8000-000000000002","prescribedSets":1,"prescribedReps":"10","targetLoad":"30 lbs","rest":"60 s","baseRepetitions":10,"repetitionsIncrement":2,"baseLoad":30,"loadIncrement":10,"loadUnit":"lbs"}]}
    ]'::jsonb
  ) is not null,
  true,
  'coach can create a cycle program alongside single-day programming'
);
select extensions.is(
  public.publish_training_program((select id from public.routine_assignments where title = 'Ciclo A')),
  (select id from public.routine_assignments where title = 'Ciclo A'),
  'coach publishes the cycle program'
);

select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000002', true);
select extensions.throws_ok(
  $$select public.save_routine_exercise_performance(
    (select id from public.routine_assignments where title = 'Ciclo A'), 1,
    (select item.id from public.routine_assignment_items as item join public.routine_assignment_days as day on day.id = item.cycle_day_id where day.assignment_id = (select id from public.routine_assignments where title = 'Ciclo A') and day.position = 1 limit 1),
    true, 8, 40, 'kg', null, null
  )$$,
  'P0001', 'single_day_program_takes_precedence',
  'published single-day routine takes precedence over cycle play on the same UTC date'
);
select extensions.throws_ok(
  $$select public.save_routine_exercise_performance(
    (select id from public.routine_assignments where title = 'Hoy'), 1,
    (select item.id from public.routine_assignment_items as item join public.routine_assignment_days as day on day.id = item.cycle_day_id where day.assignment_id = (select id from public.routine_assignments where title = 'Hoy') limit 1),
    false, null, null, null, null, null
  )$$,
  'P0001', 'first_completed_exercise_required',
  'opening an exercise without marking it complete does not create an execution'
);
select extensions.is(
  (select count(*)::integer from public.routine_executions where student_id = 'e1000000-0000-4000-8000-000000000002'),
  0,
  'no execution row exists before the first completed exercise is saved'
);
select extensions.throws_ok(
  $$select public.save_routine_exercise_performance(
    (select id from public.routine_assignments where title = 'Hoy'), 1,
    (select item.id from public.routine_assignment_items as item join public.routine_assignment_days as day on day.id = item.cycle_day_id where day.assignment_id = (select id from public.routine_assignments where title = 'Hoy') limit 1),
    true, 10, null, null, null::numeric, null::numeric
  )$$,
  '22023', 'completed_weighted_exercise_requires_load',
  'completed weighted exercise requires actual load and unit'
);
select extensions.throws_ok(
  $$select public.save_routine_exercise_performance(
    (select id from public.routine_assignments where title = 'Hoy'), 1,
    (select item.id from public.routine_assignment_items as item join public.routine_assignment_days as day on day.id = item.cycle_day_id where day.assignment_id = (select id from public.routine_assignments where title = 'Hoy') limit 1),
    true, 10, 40, 'kg', 2.5::numeric, 80::numeric
  )$$,
  '22023', 'invalid_actual_performance',
  'fractional RIR is rejected before integer conversion'
);
select extensions.is(
  (public.save_routine_exercise_performance(
    (select id from public.routine_assignments where title = 'Hoy'), 1,
    (select item.id from public.routine_assignment_items as item join public.routine_assignment_days as day on day.id = item.cycle_day_id where day.assignment_id = (select id from public.routine_assignments where title = 'Hoy') limit 1),
    true, 10, 40, 'kg', null, null
  ) ->> 'progressPercent')::numeric,
  100::numeric,
  'one completed exercise derives one hundred percent regardless of prescribed set count'
);
select extensions.is(
  (select count(*)::integer from public.routine_executions where student_id = 'e1000000-0000-4000-8000-000000000002' and execution_date = (pg_catalog.timezone('UTC', pg_catalog.now()))::date),
  1,
  'first completed exercise consumes one daily execution start'
);
select extensions.is(
  (public.save_routine_exercise_performance(
    (select id from public.routine_assignments where title = 'Hoy'), 1,
    (select item.id from public.routine_assignment_items as item join public.routine_assignment_days as day on day.id = item.cycle_day_id where day.assignment_id = (select id from public.routine_assignments where title = 'Hoy') limit 1),
    true, 9, 40, 'kg', 2, 85
  ) ->> 'progressPercent')::numeric,
  100::numeric,
  'one exercise record updates the existing exercise completion and effort'
);
select extensions.is(
  (select count(*)::integer from public.routine_execution_exercises where execution_id = (select id from public.routine_executions where student_id = 'e1000000-0000-4000-8000-000000000002')),
  1,
  'one execution stores exactly one performance record for the exercise'
);
select extensions.is(
  (select count(*)::integer from public.routine_execution_sets where execution_id = (select id from public.routine_executions where student_id = 'e1000000-0000-4000-8000-000000000002')),
  0,
  'new execution does not create redundant per-set actual records'
);
select extensions.is(
  (select status::text from public.routine_executions where student_id = 'e1000000-0000-4000-8000-000000000002'),
  'COMPLETED',
  'all prescribed exercises and effort values close the execution as completed'
);
select extensions.throws_ok(
  $$select public.save_routine_exercise_performance(
    (select id from public.routine_assignments where title = 'Hoy'), 1,
    (select item.id from public.routine_assignment_items as item join public.routine_assignment_days as day on day.id = item.cycle_day_id where day.assignment_id = (select id from public.routine_assignments where title = 'Hoy') limit 1),
    true, 10, 40, 'kg', 2, 85
  )$$,
  'P0001', 'execution_not_editable',
  'completed execution is immutable'
);

select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
select extensions.is(
  public.save_training_program_draft(
    null, 'e1000000-0000-4000-8000-000000000003', 'CYCLE', null, 'Ciclo B', 1,
    '[
      {"position":1,"title":"Día A","items":[{"sourceType":"catalog","sourceId":"b2000000-0000-4000-8000-000000000001","prescribedSets":2,"prescribedReps":"8","targetLoad":"40 kg","rest":"90 s","baseRepetitions":8,"repetitionsIncrement":1,"baseLoad":40,"loadIncrement":5,"loadUnit":"kg"}]},
      {"position":2,"title":"Día B","items":[{"sourceType":"catalog","sourceId":"b2000000-0000-4000-8000-000000000002","prescribedSets":1,"prescribedReps":"10","targetLoad":"30 lbs","rest":"60 s","baseRepetitions":10,"repetitionsIncrement":2,"baseLoad":30,"loadIncrement":10,"loadUnit":"lbs"}]}
    ]'::jsonb
  ) is not null,
  true,
  'coach creates a cycle for another student'
);
select extensions.is(
  public.publish_training_program((select id from public.routine_assignments where title = 'Ciclo B')),
  (select id from public.routine_assignments where title = 'Ciclo B'),
  'coach publishes the second cycle'
);

select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000003', true);
select extensions.is(
  public.save_routine_exercise_performance(
    (select id from public.routine_assignments where title = 'Ciclo B'), 1,
    (select item.id from public.routine_assignment_items as item join public.routine_assignment_days as day on day.id = item.cycle_day_id where day.assignment_id = (select id from public.routine_assignments where title = 'Ciclo B') and day.position = 1 limit 1),
    true, 8, 40, 'kg', null, null
  ) ->> 'slotAttempt',
  '1',
  'first cycle execution uses slot attempt one'
);

reset role;
set local role service_role;
update public.routine_executions
set execution_date = (pg_catalog.timezone('UTC', pg_catalog.now()))::date - 1
where student_id = 'e1000000-0000-4000-8000-000000000003';
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000003', true);
select extensions.is(public.close_expired_routine_executions(), 1, 'next-day access closes prior incomplete execution');
select extensions.is(
  (select status::text from public.routine_executions where student_id = 'e1000000-0000-4000-8000-000000000003'),
  'CLOSED_INCOMPLETE',
  'closed incomplete execution remains in history'
);
select extensions.is(
  public.save_routine_exercise_performance(
    (select id from public.routine_assignments where title = 'Ciclo B'), 1,
    (select item.id from public.routine_assignment_items as item join public.routine_assignment_days as day on day.id = item.cycle_day_id where day.assignment_id = (select id from public.routine_assignments where title = 'Ciclo B') and day.position = 1 limit 1),
    true, 8, 40, 'kg', null, null
  ) ->> 'slotAttempt',
  '2',
  'incomplete attempt consumes its slot attempt but next cycle iteration is available'
);
select extensions.throws_ok(
  $$select public.save_routine_exercise_performance(
    (select id from public.routine_assignments where title = 'Ciclo B'), 2,
    (select item.id from public.routine_assignment_items as item join public.routine_assignment_days as day on day.id = item.cycle_day_id where day.assignment_id = (select id from public.routine_assignments where title = 'Ciclo B') and day.position = 2 limit 1),
    true, 10, 30, 'lbs', null, null
  )$$,
  'P0001', 'daily_execution_limit',
  'student cannot start a second routine on the same UTC date'
);

reset role;
set local role service_role;
update public.routine_executions
set execution_date = (pg_catalog.timezone('UTC', pg_catalog.now()))::date - 2
where student_id = 'e1000000-0000-4000-8000-000000000003'
  and slot_attempt = 1;
update public.routine_executions
set execution_date = (pg_catalog.timezone('UTC', pg_catalog.now()))::date - 1
where student_id = 'e1000000-0000-4000-8000-000000000003'
  and slot_attempt = 2;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000003', true);
select extensions.is(public.close_expired_routine_executions(), 1, 'second incomplete attempt closes after its UTC date');
select extensions.throws_ok(
  $$select public.save_routine_exercise_performance(
    (select id from public.routine_assignments where title = 'Ciclo B'), 1,
    (select item.id from public.routine_assignment_items as item join public.routine_assignment_days as day on day.id = item.cycle_day_id where day.assignment_id = (select id from public.routine_assignments where title = 'Ciclo B') and day.position = 1 limit 1),
    true, 8, 40, 'kg', null, null
  )$$,
  'P0001', 'cycle_slot_attempts_exhausted',
  'slot cannot be attempted more than the authored cycle plus additional repeats'
);
select extensions.is(
  (select count(*)::integer from public.routine_executions),
  2,
  'student can read only their own execution history'
);

select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000004', true);
select extensions.is(
  (select count(*)::integer from public.routine_executions),
  0,
  'another student cannot read execution history'
);
select extensions.is(
  (select count(*)::integer from public.routine_execution_sets),
  0,
  'another student cannot read actual set records'
);

select * from extensions.finish();
rollback;
