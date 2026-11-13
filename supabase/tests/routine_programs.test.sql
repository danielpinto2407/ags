begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(18);

insert into public.tenants (id, name, subdomain, status)
values ('d0000000-0000-4000-8000-000000000001', 'Program Gym', 'program-gym', 'ACTIVE');

insert into auth.users (id, email)
values
  ('d1000000-0000-4000-8000-000000000001', 'program-coach@example.test'),
  ('d1000000-0000-4000-8000-000000000002', 'program-student@example.test'),
  ('d1000000-0000-4000-8000-000000000003', 'program-other-student@example.test');

insert into public.profiles (id, tenant_id, role, status, full_name, coach_id)
values
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Program Coach', null),
  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Program Student', 'd1000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Other Student', 'd1000000-0000-4000-8000-000000000001');

select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.routine_assignment_days'::pg_catalog.regclass),
  'RLS is enabled on unified program days'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);

select extensions.lives_ok(
  $$insert into public.routine_assignments (
    id, tenant_id, coach_id, student_id, scheduled_for, title
  ) values (
    'd2000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000001', auth.uid(),
    'd1000000-0000-4000-8000-000000000002', date '2026-12-01', 'Legacy single day'
  )$$,
  'legacy assignment insert remains a SINGLE_DAY program'
);
select extensions.is(
  (select program_mode::text from public.routine_assignments where id = 'd2000000-0000-4000-8000-000000000001'),
  'SINGLE_DAY',
  'existing assignment rows default to SINGLE_DAY'
);
select extensions.is(
  (select count(*)::integer from public.routine_assignment_days where assignment_id = 'd2000000-0000-4000-8000-000000000001' and position = 1),
  1,
  'single-day program receives its first ordinal routine slot'
);

select extensions.is(
  public.save_training_program_draft(
    null,
    'd1000000-0000-4000-8000-000000000002',
    'CYCLE',
    null,
    'Fuerza A/B',
    1,
    '[
      {"position":1,"title":"Día A","items":[{"sourceType":"catalog","sourceId":"b2000000-0000-4000-8000-000000000001","prescribedSets":3,"prescribedReps":"8","targetLoad":"40 kg","rest":"90 s","baseRepetitions":8,"repetitionsIncrement":1,"baseLoad":40,"loadIncrement":5,"loadUnit":"kg"}]},
      {"position":2,"title":"Día B","items":[{"sourceType":"catalog","sourceId":"b2000000-0000-4000-8000-000000000002","prescribedSets":4,"prescribedReps":"10","targetLoad":"30 lbs","rest":"60 s","baseRepetitions":10,"repetitionsIncrement":2,"baseLoad":30,"loadIncrement":10,"loadUnit":"lbs"}]}
    ]'::jsonb
  ) is not null,
  true,
  'coach can save a cycle with two ordinal routine slots'
);

select extensions.is(
  (select program_mode::text from public.routine_assignments where title = 'Fuerza A/B'),
  'CYCLE',
  'cycle program persists the discriminated mode'
);
select extensions.is(
  (select scheduled_for from public.routine_assignments where title = 'Fuerza A/B'),
  null::date,
  'cycle program has no calendar date on its plan root'
);
select extensions.is(
  (select additional_cycle_repeats from public.routine_assignments where title = 'Fuerza A/B'),
  1,
  'cycle program stores additional repeats separately'
);
select extensions.is(
  (select count(*)::integer from public.routine_assignment_days where assignment_id = (select id from public.routine_assignments where title = 'Fuerza A/B')),
  2,
  'cycle has the configured number of ordered slots'
);
select extensions.is(
  (select count(*)::integer
   from public.routine_assignment_items as item
   join public.routine_assignment_days as day on day.id = item.cycle_day_id
   where day.assignment_id = (select id from public.routine_assignments where title = 'Fuerza A/B')),
  2,
  'each cycle slot stores its routine exercise items'
);
select extensions.is(
  public.publish_training_program((select id from public.routine_assignments where title = 'Fuerza A/B')),
  (select id from public.routine_assignments where title = 'Fuerza A/B'),
  'coach can publish a complete cycle program'
);

select extensions.is(
  public.save_training_program_draft(
    null, 'd1000000-0000-4000-8000-000000000002', 'CYCLE', null, 'Slot vacío', 0,
    '[{"position":1,"title":"Día A","items":[]}]'::jsonb
  ) is not null,
  true,
  'coach can save a draft with an unfinished slot'
);
select extensions.throws_ok(
  $$select public.publish_training_program((select id from public.routine_assignments where title = 'Slot vacío'))$$,
  'P0001', 'assignment_has_no_exercises',
  'cycle cannot publish when one slot has no exercises'
);

select extensions.is(
  public.save_training_program_draft(
    null, 'd1000000-0000-4000-8000-000000000002', 'CYCLE', null, 'Sin progresión', 0,
    '[{"position":1,"title":"Día A","items":[{"sourceType":"catalog","sourceId":"b2000000-0000-4000-8000-000000000001","prescribedSets":3,"prescribedReps":"8","targetLoad":"40 kg","rest":"90 s"}]}]'::jsonb
  ) is not null,
  true,
  'coach can keep an incomplete progression as a draft'
);
select extensions.throws_ok(
  $$select public.publish_training_program((select id from public.routine_assignments where title = 'Sin progresión'))$$,
  'P0001', 'cycle_progression_incomplete',
  'cycle cannot publish without numeric base repetitions and valid progression fields'
);

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
select extensions.is(
  (select count(*)::integer from public.routine_assignments where title = 'Fuerza A/B'),
  1,
  'student can read their own published cycle'
);
select extensions.is(
  (select count(*)::integer
   from public.routine_assignment_days as day
   join public.routine_assignments as assignment on assignment.id = day.assignment_id
   where assignment.title = 'Fuerza A/B'),
  2,
  'student can read slots from their published cycle'
);

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000003', true);
select extensions.is(
  (select count(*)::integer from public.routine_assignments where title = 'Fuerza A/B'),
  0,
  'another student cannot read the published cycle'
);

select * from extensions.finish();
rollback;
