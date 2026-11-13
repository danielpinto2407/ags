begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into public.tenants (id, name, subdomain, status)
values ('f0000000-0000-4000-8000-000000000001', 'Coach Info Gym', 'coach-info-gym', 'ACTIVE');

insert into auth.users (id, email)
values
  ('f1000000-0000-4000-8000-000000000001', 'coach-info-a@example.test'),
  ('f1000000-0000-4000-8000-000000000002', 'coach-info-b@example.test'),
  ('f1000000-0000-4000-8000-000000000003', 'coach-info-student@example.test'),
  ('f1000000-0000-4000-8000-000000000004', 'coach-info-unlinked@example.test');

insert into public.profiles (id, tenant_id, role, status, full_name, coach_id)
values
  ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Coach Invitante Uno', null),
  ('f1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Coach Invitante Dos', null),
  ('f1000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Alumna Vinculada', 'f1000000-0000-4000-8000-000000000001'),
  ('f1000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Alumna Sin Coach', null);

select extensions.ok(
  pg_catalog.to_regprocedure('public.get_own_coach_name()') is not null,
  'own coach name RPC is installed'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000003', true);
select extensions.is(
  public.get_own_coach_name(),
  'Coach Invitante Uno',
  'student sees the name of the coach linked to their own profile'
);

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000004', true);
select extensions.is(
  public.get_own_coach_name(),
  null::text,
  'student without a linked coach receives null'
);

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);
select extensions.is(
  public.get_own_coach_name(),
  null::text,
  'coach cannot use the student-only name lookup to enumerate profiles'
);

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000001', true);
select extensions.ok(
  public.save_training_program_draft(
    null,
    'f1000000-0000-4000-8000-000000000003',
    'SINGLE_DAY',
    date '2026-11-12',
    'Instrucciones coach',
    0,
    '[{"position":1,"title":"Rutina","items":[{"sourceType":"catalog","sourceId":"b2000000-0000-4000-8000-000000000001","prescribedSets":1,"prescribedReps":"8","targetLoad":"20 kg","coachInstructions":"Pausa dos segundos al final de cada repetición y mantén controlado el descenso.","rest":"60 s"}]}]'::jsonb
  ) is not null,
  'coach can save instructions with a routine item'
);
select extensions.is(
  (select item.coach_instructions
   from public.routine_assignment_items as item
   join public.routine_assignments as assignment on assignment.id = item.assignment_id
   where assignment.title = 'Instrucciones coach'
   limit 1),
  'Pausa dos segundos al final de cada repetición y mantén controlado el descenso.',
  'coach instructions persist separately from exercise definition and prescribed load'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select extensions.throws_ok(
  $$select public.get_own_coach_name()$$,
  '42501', null,
  'anonymous callers cannot retrieve a coach name'
);

select * from extensions.finish();
rollback;
