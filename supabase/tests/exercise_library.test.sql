-- CU-02: cross-tenant catalog and tenant-owned exercise library RLS.
-- Run locally with: npx supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(39);

insert into public.tenants (id, name, subdomain, status)
values
  ('f0000000-0000-4000-8000-000000000001', 'Exercise Library Gym A', 'exercise-gym-a', 'ACTIVE'),
  ('f0000000-0000-4000-8000-000000000002', 'Exercise Library Gym B', 'exercise-gym-b', 'ACTIVE'),
  ('f0000000-0000-4000-8000-000000000003', 'Exercise Library Paused Gym', 'exercise-gym-paused', 'SUSPENDED');

insert into auth.users (id, email)
values
  ('f1000000-0000-4000-8000-000000000001', 'exercise-coach-a@example.test'),
  ('f1000000-0000-4000-8000-000000000002', 'exercise-coach-b@example.test'),
  ('f1000000-0000-4000-8000-000000000003', 'exercise-inactive-coach@example.test'),
  ('f1000000-0000-4000-8000-000000000004', 'exercise-member@example.test'),
  ('f1000000-0000-4000-8000-000000000005', 'exercise-paused-coach@example.test');

insert into public.profiles (id, tenant_id, role, status, full_name)
values
  ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Exercise Coach A'),
  ('f1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 'coach_admin', 'ACTIVE', 'Exercise Coach B'),
  ('f1000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001', 'coach_admin', 'INACTIVE', 'Inactive Exercise Coach'),
  ('f1000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000001', 'user_general', 'ACTIVE', 'Exercise Library Member'),
  ('f1000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000003', 'coach_admin', 'ACTIVE', 'Paused Exercise Coach');

select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.exercise_catalog'::pg_catalog.regclass),
  'RLS is enabled on the shared exercise catalog'
);
select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.tenant_exercises'::pg_catalog.regclass),
  'RLS is enabled on tenant-owned exercises'
);

set local role service_role;
insert into public.exercise_catalog (
  id, catalog_key, name, focus, primary_muscles, equipment, movement_pattern,
  difficulty, instructions, tips
)
values (
  'f2000000-0000-4000-8000-000000000001', 'exercise-rls-fixture', 'Shared Hip Thrust',
  'GLUTES', array['gluteus maximus'], array['BARBELL']::public.exercise_equipment[],
  'HIP_THRUST', 'INTERMEDIATE', 'Fixture instructions', 'Fixture tips'
);

insert into public.tenant_exercises (
  id, tenant_id, source_catalog_exercise_id, created_by, name, focus,
  primary_muscles, equipment, movement_pattern, difficulty, instructions, tips
)
values
  (
    'f3000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'f2000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000001',
    'Gym A Hip Thrust', 'GLUTES', array['gluteus maximus'],
    array['BARBELL']::public.exercise_equipment[], 'HIP_THRUST', 'INTERMEDIATE', 'Gym A instructions', ''
  ),
  (
    'f3000000-0000-4000-8000-000000000002',
    'f0000000-0000-4000-8000-000000000002',
    null,
    'f1000000-0000-4000-8000-000000000002',
    'Gym B Row', 'UPPER_BODY', array['latissimus dorsi'],
    array['DUMBBELLS']::public.exercise_equipment[], 'HORIZONTAL_PULL', 'BEGINNER', 'Gym B instructions', ''
  );
reset role;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select extensions.throws_ok(
  $$select id from public.exercise_catalog$$,
  '42501', null,
  'anonymous users cannot read the shared exercise catalog'
);
select extensions.throws_ok(
  $$select id from public.tenant_exercises$$,
  '42501', null,
  'anonymous users cannot read tenant exercises'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000001', true);
select extensions.is(
  (select count(*)::integer from public.exercise_catalog where id = 'f2000000-0000-4000-8000-000000000001'),
  1,
  'active coach can read the shared catalog'
);
select extensions.is(
  (select count(*)::integer from public.tenant_exercises where tenant_id = 'f0000000-0000-4000-8000-000000000001'),
  1,
  'coach can read exercises in their own gym'
);
select extensions.is(
  (select count(*)::integer from public.tenant_exercises where tenant_id = 'f0000000-0000-4000-8000-000000000002'),
  0,
  'coach cannot read another gym library'
);
select extensions.lives_ok(
  $$insert into public.tenant_exercises (
    tenant_id, created_by, name, focus, primary_muscles, equipment,
    movement_pattern, difficulty, instructions
  ) values (
    'f0000000-0000-4000-8000-000000000001', auth.uid(), 'Coach Created Exercise',
    'GLUTES', array['gluteus maximus'], array['DUMBBELLS']::public.exercise_equipment[],
    'LUNGE', 'BEGINNER', 'Coach authored instructions'
  )$$,
  'active coach can create an exercise for their own gym'
);
select extensions.lives_ok(
  $$update public.tenant_exercises set name = 'Coach Edited Exercise'
    where name = 'Coach Created Exercise'$$,
  'active coach can edit a gym-owned exercise'
);
select extensions.lives_ok(
  $$update public.tenant_exercises set archived_at = pg_catalog.now()
    where name = 'Coach Edited Exercise'$$,
  'active coach can archive a gym-owned exercise'
);
select extensions.is(
  (select count(*)::integer from public.tenant_exercises where name = 'Coach Edited Exercise' and archived_at is not null),
  1,
  'archived exercise remains available to its coach for library management'
);
select extensions.throws_ok(
  $$update public.tenant_exercises set tenant_id = 'f0000000-0000-4000-8000-000000000002'
    where id = 'f3000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'coach cannot move an exercise to another tenant'
);
select extensions.throws_ok(
  $$update public.tenant_exercises set source_catalog_exercise_id = null
    where id = 'f3000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'catalog copy provenance cannot be changed'
);
select extensions.throws_ok(
  $$insert into public.exercise_catalog (
    catalog_key, name, focus, primary_muscles, equipment, movement_pattern,
    difficulty, instructions
  ) values (
    'client-global-write', 'Forbidden', 'GLUTES', array['gluteus maximus'],
    array['BODYWEIGHT']::public.exercise_equipment[], 'SQUAT', 'BEGINNER', 'Forbidden'
  )$$,
  '42501', null,
  'coach cannot insert records into the shared catalog'
);
select extensions.throws_ok(
  $$update public.exercise_catalog set name = 'Changed Source'
    where id = 'f2000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'coach cannot edit records in the shared catalog'
);
select extensions.throws_ok(
  $$insert into public.tenant_exercises (
    tenant_id, created_by, name, focus, primary_muscles, equipment,
    movement_pattern, difficulty, instructions
  ) values (
    'f0000000-0000-4000-8000-000000000002', auth.uid(), 'Cross Tenant Write',
    'GLUTES', array['gluteus maximus'], array['DUMBBELLS']::public.exercise_equipment[],
    'LUNGE', 'BEGINNER', 'Forbidden'
  )$$,
  '42501', null,
  'coach cannot create exercises for another gym'
);
select extensions.lives_ok(
  $$insert into public.tenant_exercises (
    tenant_id, source_catalog_exercise_id, created_by, name, focus,
    primary_muscles, equipment, movement_pattern, difficulty, instructions
  ) values (
    'f0000000-0000-4000-8000-000000000001',
    'f2000000-0000-4000-8000-000000000001', auth.uid(), 'My Shared Hip Thrust Copy',
    'GLUTES', array['gluteus maximus'], array['BARBELL']::public.exercise_equipment[],
    'HIP_THRUST', 'INTERMEDIATE', 'Copied instructions'
  )$$,
  'coach can copy a shared exercise into their own gym'
);
select extensions.is(
  (select source_catalog_exercise_id from public.tenant_exercises where name = 'My Shared Hip Thrust Copy'),
  'f2000000-0000-4000-8000-000000000001'::uuid,
  'tenant copy records its shared catalog source'
);
select extensions.lives_ok(
  $$update public.tenant_exercises set name = 'My Edited Hip Thrust Copy'
    where name = 'My Shared Hip Thrust Copy'$$,
  'coach can independently edit the copied exercise'
);

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);
select extensions.is(
  (select count(*)::integer from public.exercise_catalog where id = 'f2000000-0000-4000-8000-000000000001'),
  1,
  'a coach in another active gym can read the shared catalog'
);
select extensions.is(
  (select count(*)::integer from public.tenant_exercises where tenant_id = 'f0000000-0000-4000-8000-000000000002'),
  1,
  'second coach can read their own gym library'
);
select extensions.is(
  (select count(*)::integer from public.tenant_exercises where tenant_id = 'f0000000-0000-4000-8000-000000000001'),
  0,
  'second coach cannot read the first gym library'
);
update public.tenant_exercises
set name = 'Unauthorized Change'
where id = 'f3000000-0000-4000-8000-000000000001';
select extensions.is(
  (select count(*)::integer from public.tenant_exercises where id = 'f3000000-0000-4000-8000-000000000001'),
  0,
  'second coach cannot access or update the first gym exercise'
);

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000004', true);
select extensions.is(
  (select count(*)::integer from public.exercise_catalog where id = 'f2000000-0000-4000-8000-000000000001'),
  1,
  'active member can read the shared catalog for assigned exercise details'
);
select extensions.is(
  (select count(*)::integer from public.tenant_exercises),
  0,
  'member cannot read coach library records directly'
);
select extensions.throws_ok(
  $$insert into public.tenant_exercises (
    tenant_id, created_by, name, focus, primary_muscles, equipment,
    movement_pattern, difficulty, instructions
  ) values (
    'f0000000-0000-4000-8000-000000000001', auth.uid(), 'Member Write',
    'CORE', array['core'], array['BODYWEIGHT']::public.exercise_equipment[],
    'CORE_STABILITY', 'BEGINNER', 'Forbidden'
  )$$,
  '42501', null,
  'member cannot create coach library exercises'
);

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000003', true);
select extensions.is(
  (select count(*)::integer from public.exercise_catalog where id = 'f2000000-0000-4000-8000-000000000001'),
  0,
  'inactive coach cannot read the shared catalog'
);
select extensions.is(
  (select count(*)::integer from public.tenant_exercises),
  0,
  'inactive coach cannot read tenant library data'
);

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000005', true);
select extensions.is(
  (select count(*)::integer from public.exercise_catalog where id = 'f2000000-0000-4000-8000-000000000001'),
  0,
  'coach in suspended gym cannot read the shared catalog'
);
select extensions.is(
  (select count(*)::integer from public.tenant_exercises),
  0,
  'coach in suspended gym cannot read tenant library data'
);

reset role;
set local role service_role;
select extensions.is(
  (select name from public.exercise_catalog where id = 'f2000000-0000-4000-8000-000000000001'),
  'Shared Hip Thrust',
  'copy edits do not mutate the shared source'
);
select extensions.is(
  (select name from public.tenant_exercises where name = 'My Edited Hip Thrust Copy'),
  'My Edited Hip Thrust Copy',
  'copied exercise persists as an independent tenant-owned record'
);
select extensions.is(
  (select name from public.tenant_exercises where id = 'f3000000-0000-4000-8000-000000000001'),
  'Gym A Hip Thrust',
  'cross-tenant update attempt left the source gym record unchanged'
);
select extensions.lives_ok(
  $$update public.exercise_catalog set archived_at = pg_catalog.now()
    where id = 'f2000000-0000-4000-8000-000000000001'$$,
  'trusted catalog maintenance can archive a shared source'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000001', true);
select extensions.lives_ok(
  $$update public.tenant_exercises set tips = 'Copy remains editable after source archive'
    where name = 'My Edited Hip Thrust Copy'$$,
  'a tenant copy remains editable after its shared source is archived'
);

reset role;
set local role service_role;
select extensions.ok(
  (select archived_at is not null from public.exercise_catalog where id = 'f2000000-0000-4000-8000-000000000001'),
  'shared source archive state is persisted'
);
select extensions.is(
  (select tips from public.tenant_exercises where name = 'My Edited Hip Thrust Copy'),
  'Copy remains editable after source archive',
  'tenant copy retains independent edits after its source is archived'
);
select extensions.throws_ok(
  $$insert into public.exercise_catalog (
    catalog_key, name, focus, primary_muscles, equipment, movement_pattern,
    difficulty, instructions, video_url
  ) values (
    'invalid-http-video', 'Invalid Video', 'GLUTES', array['gluteus maximus'],
    array['BODYWEIGHT']::public.exercise_equipment[], 'SQUAT', 'BEGINNER', 'Valid instructions', 'http://example.test/video'
  )$$,
  '23514', null,
  'exercise videos reject non-HTTPS URLs'
);
select extensions.throws_ok(
  $$insert into public.exercise_catalog (
    catalog_key, name, focus, primary_muscles, equipment, movement_pattern,
    difficulty, instructions
  ) values (
    'invalid-empty-equipment', 'Invalid Equipment', 'GLUTES', array['gluteus maximus'],
    '{}'::public.exercise_equipment[], 'SQUAT', 'BEGINNER', 'Valid instructions'
  )$$,
  '23514', null,
  'exercise requires at least one equipment option'
);

select * from extensions.finish();
rollback;