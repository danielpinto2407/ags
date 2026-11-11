-- CU-03: personalized assignment ownership, snapshots, draft and publication RLS.
-- Run locally with: npx supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(39);

insert into public.tenants (id, name, subdomain, status)
values
  ('c0000000-0000-4000-8000-000000000001', 'Routine Gym A', 'routine-gym-a', 'ACTIVE'),
  ('c0000000-0000-4000-8000-000000000002', 'Routine Gym B', 'routine-gym-b', 'ACTIVE');

insert into auth.users (id, email)
values
  ('c1000000-0000-4000-8000-000000000001', 'routine-coach-a@example.test'),
  ('c1000000-0000-4000-8000-000000000002', 'routine-coach-b@example.test'),
  ('c1000000-0000-4000-8000-000000000003', 'routine-student-a@example.test'),
  ('c1000000-0000-4000-8000-000000000004', 'routine-student-a2@example.test'),
  ('c1000000-0000-4000-8000-000000000005', 'routine-student-b@example.test'),
  ('c1000000-0000-4000-8000-000000000006', 'routine-inactive-student@example.test');

insert into public.profiles (id, tenant_id, role, status, full_name, coach_id)
values
  ('c1000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Routine Coach A', null),
  ('c1000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'coach_admin', 'ACTIVE', 'Routine Coach B', null),
  ('c1000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Routine Student A', 'c1000000-0000-4000-8000-000000000001'),
  ('c1000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Routine Student A2', 'c1000000-0000-4000-8000-000000000001'),
  ('c1000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', 'user_personalized', 'ACTIVE', 'Routine Student B', 'c1000000-0000-4000-8000-000000000002'),
  ('c1000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', 'user_personalized', 'INACTIVE', 'Routine Inactive Student', 'c1000000-0000-4000-8000-000000000001');

select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.routine_assignments'::pg_catalog.regclass),
  'RLS is enabled on routine assignments'
);
select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.routine_assignment_items'::pg_catalog.regclass),
  'RLS is enabled on routine assignment items'
);

reset role;
set local role service_role;
insert into public.tenant_exercises (
  id, tenant_id, created_by, name, focus, primary_muscles, equipment,
  movement_pattern, difficulty, instructions, tips
)
values (
  'c2000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000002',
  'c1000000-0000-4000-8000-000000000002',
  'Other Gym Exercise', 'UPPER_BODY', array['latissimus dorsi'],
  array['DUMBBELLS']::public.exercise_equipment[], 'HORIZONTAL_PULL', 'BEGINNER',
  'Other gym instructions', 'Other gym tips'
);
reset role;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select extensions.throws_ok(
  $$select id from public.routine_assignments$$,
  '42501', null,
  'anonymous users cannot read routine assignments'
);
select extensions.throws_ok(
  $$select id from public.routine_assignment_items$$,
  '42501', null,
  'anonymous users cannot read assignment items'
);
select extensions.throws_ok(
  $$select public.publish_routine_assignment('c3000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'anonymous users cannot publish a routine assignment'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select extensions.lives_ok(
  $$insert into public.routine_assignments (
    id, tenant_id, coach_id, student_id, scheduled_for, title
  ) values (
    'c3000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001', auth.uid(),
    'c1000000-0000-4000-8000-000000000003', date '2026-11-12', 'Rutina jueves'
  )$$,
  'active coach can create a draft for their own active member and tenant'
);
select extensions.is(
  (select count(*)::integer from public.routine_assignments where id = 'c3000000-0000-4000-8000-000000000001'),
  1,
  'coach can read their draft assignment'
);
select extensions.lives_ok(
  $$insert into public.routine_assignment_items (
    tenant_id, assignment_id, position, catalog_exercise_id, exercise_snapshot,
    prescribed_sets, prescribed_reps, target_load, rest
  ) values (
    'c0000000-0000-4000-8000-000000000001',
    'c3000000-0000-4000-8000-000000000001', 0,
    'b2000000-0000-4000-8000-000000000001',
    '{"id":"forged","name":"Fake Client Snapshot"}'::jsonb,
    4, '10-12', '40 kg', '90 s'
  )$$,
  'coach can add a catalog exercise to their draft assignment'
);
select extensions.is(
  (select exercise_snapshot ->> 'name' from public.routine_assignment_items where assignment_id = 'c3000000-0000-4000-8000-000000000001'),
  'Hip thrust con barra',
  'database snapshots the authoritative catalog definition instead of client-supplied content'
);
select extensions.is(
  (select exercise_snapshot ->> 'id' from public.routine_assignment_items where assignment_id = 'c3000000-0000-4000-8000-000000000001'),
  'b2000000-0000-4000-8000-000000000001',
  'exercise snapshot preserves the stable source ID'
);
select extensions.lives_ok(
  $$update public.routine_assignment_items set prescribed_sets = 5
    where assignment_id = 'c3000000-0000-4000-8000-000000000001'$$,
  'coach can edit prescription values while assignment is a draft'
);
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000003', true);
select extensions.is(
  (select count(*)::integer from public.routine_assignments where id = 'c3000000-0000-4000-8000-000000000001'),
  0,
  'student cannot read a draft assignment before it is published'
);
select extensions.is(
  (select count(*)::integer from public.routine_assignment_items where assignment_id = 'c3000000-0000-4000-8000-000000000001'),
  0,
  'student cannot read items from a draft assignment'
);
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select extensions.throws_ok(
  $$update public.routine_assignment_items set exercise_snapshot = '{"name":"Changed"}'::jsonb
    where assignment_id = 'c3000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'client has no column grant to rewrite an item snapshot'
);
select extensions.throws_ok(
  $$insert into public.routine_assignment_items (
    tenant_id, assignment_id, position, tenant_exercise_id, exercise_snapshot,
    prescribed_sets, prescribed_reps, rest
  ) values (
    'c0000000-0000-4000-8000-000000000001',
    'c3000000-0000-4000-8000-000000000001', 1,
    'c2000000-0000-4000-8000-000000000001', '{}'::jsonb, 3, '12', '60 s'
  )$$,
  '23503', null,
  'coach cannot add a tenant exercise from another gym'
);
select extensions.is(
  public.publish_routine_assignment('c3000000-0000-4000-8000-000000000001'),
  'c3000000-0000-4000-8000-000000000001'::uuid,
  'coach can publish a non-empty assignment they own'
);
select extensions.is(
  (select status::text from public.routine_assignments where id = 'c3000000-0000-4000-8000-000000000001'),
  'PUBLISHED',
  'publication transitions the assignment from draft to published'
);
select extensions.ok(
  (select published_at is not null from public.routine_assignments where id = 'c3000000-0000-4000-8000-000000000001'),
  'publication records its timestamp'
);
select extensions.throws_ok(
  $$select public.publish_routine_assignment('c3000000-0000-4000-8000-000000000001')$$,
  'P0001', 'assignment_not_draft',
  'published assignment cannot be published twice'
);
update public.routine_assignments
set title = 'Unauthorized edit'
where id = 'c3000000-0000-4000-8000-000000000001';
select extensions.is(
  (select title from public.routine_assignments where id = 'c3000000-0000-4000-8000-000000000001'),
  'Rutina jueves',
  'coach cannot update a published assignment'
);

select extensions.lives_ok(
  $$insert into public.routine_assignments (
    id, tenant_id, coach_id, student_id, scheduled_for, title
  ) values (
    'c3000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000001', auth.uid(),
    'c1000000-0000-4000-8000-000000000004', date '2026-11-13', 'Borrador sin ejercicios'
  )$$,
  'coach can create a draft for a second member they own'
);
select extensions.throws_ok(
  $$select public.publish_routine_assignment('c3000000-0000-4000-8000-000000000002')$$,
  'P0001', 'assignment_has_no_exercises',
  'empty assignment cannot be published'
);
select extensions.is(
  public.save_routine_assignment_draft(
    null,
    'c1000000-0000-4000-8000-000000000003',
    date '2026-11-17',
    'Guardado atómico',
    '[{"sourceType":"catalog","sourceId":"b2000000-0000-4000-8000-000000000001","prescribedSets":3,"prescribedReps":"12","targetLoad":"30 kg","workDuration":"","rest":"60 s"}]'::jsonb
  ) is not null,
  true,
  'coach RPC creates a draft and exercise items atomically'
);
select extensions.is(
  (select exercise_snapshot ->> 'name'
   from public.routine_assignment_items as item
   join public.routine_assignments as assignment on assignment.id = item.assignment_id
   where assignment.student_id = 'c1000000-0000-4000-8000-000000000003'
     and assignment.scheduled_for = date '2026-11-17'),
  'Hip thrust con barra',
  'save RPC snapshots the selected catalog exercise from the database'
);
select extensions.is(
  public.save_routine_assignment_draft(
    (select id from public.routine_assignments
     where student_id = 'c1000000-0000-4000-8000-000000000003'
       and scheduled_for = date '2026-11-17'),
    'c1000000-0000-4000-8000-000000000003',
    date '2026-11-17',
    'Guardado atómico actualizado',
    '[{"sourceType":"catalog","sourceId":"b2000000-0000-4000-8000-000000000002","prescribedSets":4,"prescribedReps":"8-10","targetLoad":"40 kg","workDuration":null,"rest":"90 s"}]'::jsonb
  ),
  (select id from public.routine_assignments
   where student_id = 'c1000000-0000-4000-8000-000000000003'
     and scheduled_for = date '2026-11-17'),
  'save RPC updates an owned draft without changing its identity'
);
select extensions.is(
  (select count(*)::integer
   from public.routine_assignment_items as item
   join public.routine_assignments as assignment on assignment.id = item.assignment_id
   where assignment.student_id = 'c1000000-0000-4000-8000-000000000003'
     and assignment.scheduled_for = date '2026-11-17'),
  1,
  'saving a draft replaces its items instead of duplicating them'
);
select extensions.throws_ok(
  $$select public.save_routine_assignment_draft(
    null, 'c1000000-0000-4000-8000-000000000005', date '2026-11-18', 'Wrong student', '[]'::jsonb
  )$$,
  '42501', 'student_not_active_or_owned',
  'save RPC rejects a student outside the coach ownership boundary'
);
select extensions.throws_ok(
  $$select public.save_routine_assignment_draft(
    null, 'c1000000-0000-4000-8000-000000000003', date '2026-11-19', 'Invalid exercise',
    '[{"sourceType":"tenant","sourceId":"c2000000-0000-4000-8000-000000000001","prescribedSets":3,"prescribedReps":"12","targetLoad":"","workDuration":null,"rest":"60 s"}]'::jsonb
  )$$,
  '23503', 'routine_exercise_unavailable',
  'save RPC rejects a tenant exercise from another gym'
);
select extensions.is(
  (select count(*)::integer from public.routine_assignments where scheduled_for = date '2026-11-19'),
  0,
  'failed draft save rolls back the assignment header'
);
select extensions.throws_ok(
  $$insert into public.routine_assignments (
    tenant_id, coach_id, student_id, scheduled_for
  ) values (
    'c0000000-0000-4000-8000-000000000001', auth.uid(),
    'c1000000-0000-4000-8000-000000000005', date '2026-11-14'
  )$$,
  '42501', null,
  'coach cannot assign a member owned by another coach/tenant'
);
select extensions.throws_ok(
  $$insert into public.routine_assignments (
    tenant_id, coach_id, student_id, scheduled_for
  ) values (
    'c0000000-0000-4000-8000-000000000001', auth.uid(),
    'c1000000-0000-4000-8000-000000000006', date '2026-11-15'
  )$$,
  '42501', null,
  'coach cannot assign an inactive member'
);

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select extensions.is(
  (select count(*)::integer from public.routine_assignments),
  0,
  'coach in another tenant cannot read the first coach assignments'
);
select extensions.throws_ok(
  $$select public.publish_routine_assignment('c3000000-0000-4000-8000-000000000001')$$,
  '42501', 'assignment_not_owned',
  'another coach cannot publish an assignment they do not own'
);

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000003', true);
select extensions.is(
  (select count(*)::integer from public.routine_assignments),
  1,
  'student can read their own published assignment and not drafts'
);
select extensions.is(
  (select count(*)::integer from public.routine_assignment_items),
  1,
  'student can read items from their published assignment'
);
select extensions.is(
  (select prescribed_sets::integer from public.routine_assignment_items where assignment_id = 'c3000000-0000-4000-8000-000000000001'),
  5,
  'student sees the coach prescription values'
);
select extensions.throws_ok(
  $$insert into public.routine_assignments (
    tenant_id, coach_id, student_id, scheduled_for
  ) values (
    'c0000000-0000-4000-8000-000000000001', auth.uid(), auth.uid(), date '2026-11-16'
  )$$,
  '42501', null,
  'student cannot create routine assignments'
);

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000004', true);
select extensions.is(
  (select count(*)::integer from public.routine_assignments),
  0,
  'another member cannot read assignments published to the first student'
);

reset role;
set local role service_role;
update public.profiles set status = 'INACTIVE' where id = 'c1000000-0000-4000-8000-000000000003';
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000003', true);
select extensions.is(
  (select count(*)::integer from public.routine_assignments),
  0,
  'inactive student loses access to published assignments'
);

select * from extensions.finish();
rollback;
