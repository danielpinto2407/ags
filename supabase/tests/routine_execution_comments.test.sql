begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into public.tenants (id, name, subdomain, status)
values
  ('e8000000-0000-4000-8000-000000000001', 'Comments Gym', 'comments-gym', 'ACTIVE'),
  ('e8000000-0000-4000-8000-000000000002', 'Other Comments Gym', 'other-comments-gym', 'ACTIVE');

insert into auth.users (id, email)
values
  ('e8100000-0000-4000-8000-000000000001', 'comments-coach@example.test'),
  ('e8100000-0000-4000-8000-000000000002', 'comments-student@example.test'),
  ('e8100000-0000-4000-8000-000000000003', 'comments-other-coach@example.test'),
  ('e8100000-0000-4000-8000-000000000004', 'comments-other-student@example.test'),
  ('e8100000-0000-4000-8000-000000000005', 'comments-cross-coach@example.test');

insert into public.profiles (id, tenant_id, role, status, full_name, coach_id)
values
  ('e8100000-0000-4000-8000-000000000001', 'e8000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Comments Coach', null),
  ('e8100000-0000-4000-8000-000000000002', 'e8000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Comments Student', 'e8100000-0000-4000-8000-000000000001'),
  ('e8100000-0000-4000-8000-000000000003', 'e8000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Other Coach', null),
  ('e8100000-0000-4000-8000-000000000004', 'e8000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Other Student', 'e8100000-0000-4000-8000-000000000003'),
  ('e8100000-0000-4000-8000-000000000005', 'e8000000-0000-4000-8000-000000000002', 'coach_admin', 'ACTIVE', 'Cross Coach', null);

set local role service_role;
insert into public.routine_assignments (
  id, tenant_id, coach_id, student_id, scheduled_for, title, status, published_at,
  program_mode, cycle_day_count, additional_cycle_repeats
) values (
  'e8200000-0000-4000-8000-000000000001', 'e8000000-0000-4000-8000-000000000001',
  'e8100000-0000-4000-8000-000000000001', 'e8100000-0000-4000-8000-000000000002',
  date '2026-11-22', 'Comentario A', 'PUBLISHED', pg_catalog.now(), 'SINGLE_DAY', 1, 0
);

insert into public.routine_executions (
  id, tenant_id, assignment_id, cycle_day_id, student_id, execution_date, status, closed_at
) values (
  'e8400000-0000-4000-8000-000000000001', 'e8000000-0000-4000-8000-000000000001',
  'e8200000-0000-4000-8000-000000000001',
  (select id from public.routine_assignment_days where assignment_id = 'e8200000-0000-4000-8000-000000000001' and position = 1),
  'e8100000-0000-4000-8000-000000000002', date '2026-11-22', 'COMPLETED', pg_catalog.now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e8100000-0000-4000-8000-000000000001', true);

select extensions.is(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.routine_execution_comments'::pg_catalog.regclass),
  true,
  'RLS is enabled on workout comments'
);

insert into public.routine_execution_comments (tenant_id, execution_id, author_id, author_name, body)
values ('e8000000-0000-4000-8000-000000000001', 'e8400000-0000-4000-8000-000000000001', 'e8100000-0000-4000-8000-000000000001', 'Nombre falso', 'Buen trabajo en la técnica del día.');

select extensions.is(
  (select count(*)::integer from public.routine_execution_comments where execution_id = 'e8400000-0000-4000-8000-000000000001'),
  1,
  'assigned coach can read and create workout feedback'
);

select set_config('request.jwt.claim.sub', 'e8100000-0000-4000-8000-000000000002', true);

insert into public.routine_execution_comments (tenant_id, execution_id, author_id, body)
values ('e8000000-0000-4000-8000-000000000001', 'e8400000-0000-4000-8000-000000000001', 'e8100000-0000-4000-8000-000000000002', 'Gracias, el próximo día intento subir la carga.');

select extensions.is(
  (select count(*)::integer from public.routine_execution_comments where execution_id = 'e8400000-0000-4000-8000-000000000001'),
  2,
  'owning student can respond to workout feedback'
);
select extensions.is(
  (select author_name from public.routine_execution_comments
   where author_id = 'e8100000-0000-4000-8000-000000000001'),
  'Comments Coach',
  'student-visible coach comment carries the server-snapshotted author name'
);
select extensions.is(
  (select author_name from public.routine_execution_comments
   where author_id = 'e8100000-0000-4000-8000-000000000001'),
  'Comments Coach',
  'client-provided author_name cannot override the profile name'
);

select set_config('request.jwt.claim.sub', 'e8100000-0000-4000-8000-000000000003', true);
select extensions.throws_ok(
  $$insert into public.routine_execution_comments (tenant_id, execution_id, author_id, body)
    values ('e8000000-0000-4000-8000-000000000001', 'e8400000-0000-4000-8000-000000000001', 'e8100000-0000-4000-8000-000000000003', 'No debería poder escribir esto');$$,
  '42501', null,
  'unassigned coach cannot write workout feedback'
);

select set_config('request.jwt.claim.sub', 'e8100000-0000-4000-8000-000000000004', true);
select extensions.throws_ok(
  $$insert into public.routine_execution_comments (tenant_id, execution_id, author_id, body)
    values ('e8000000-0000-4000-8000-000000000001', 'e8400000-0000-4000-8000-000000000001', 'e8100000-0000-4000-8000-000000000004', 'No debería leer esto');$$,
  '42501', null,
  'other student cannot write workout feedback'
);

select set_config('request.jwt.claim.sub', 'e8100000-0000-4000-8000-000000000005', true);
select extensions.throws_ok(
  $$insert into public.routine_execution_comments (tenant_id, execution_id, author_id, body)
    values ('e8000000-0000-4000-8000-000000000001', 'e8400000-0000-4000-8000-000000000001', 'e8100000-0000-4000-8000-000000000005', 'No debería acceder desde otro tenant');$$,
  '42501', null,
  'cross-tenant coach cannot write workout feedback'
);

select set_config('request.jwt.claim.sub', 'e8100000-0000-4000-8000-000000000002', true);
select extensions.throws_ok(
  $$insert into public.routine_execution_comments (tenant_id, execution_id, author_id, body)
    values ('e8000000-0000-4000-8000-000000000001', 'e8400000-0000-4000-8000-000000000001', 'e8100000-0000-4000-8000-000000000002', '   ');$$,
  '23514', null,
  'blank comments are rejected'
);

select * from extensions.finish();
rollback;
