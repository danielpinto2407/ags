begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(36);

insert into public.tenants (id, name, subdomain, status)
values ('f2000000-0000-4000-8000-000000000001', 'Media Gym', 'media-gym', 'ACTIVE');
insert into public.tenants (id, name, subdomain, status)
values ('f2000000-0000-4000-8000-000000000002', 'Other Gym', 'other-media-gym', 'ACTIVE');

insert into auth.users (id, email)
values
  ('f3000000-0000-4000-8000-000000000001', 'media-coach@example.test'),
  ('f3000000-0000-4000-8000-000000000002', 'media-student@example.test'),
  ('f3000000-0000-4000-8000-000000000003', 'media-coach-two@example.test'),
  ('f3000000-0000-4000-8000-000000000004', 'other-media-coach@example.test');

insert into public.profiles (id, tenant_id, role, status, full_name, coach_id)
values
  ('f3000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Media Coach', null),
  ('f3000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Media Student', 'f3000000-0000-4000-8000-000000000001'),
  ('f3000000-0000-4000-8000-000000000003', 'f2000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Second Coach', null),
  ('f3000000-0000-4000-8000-000000000004', 'f2000000-0000-4000-8000-000000000002', 'coach_admin', 'ACTIVE', 'Other Coach', null);

insert into public.routine_assignments (
  id, tenant_id, coach_id, student_id, scheduled_for, title, status, published_at
)
values (
  'f4000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000002',
  (pg_catalog.timezone('UTC', pg_catalog.now()))::date - 1,
  'Rutina pasada', 'PUBLISHED', pg_catalog.now()
);

update public.profiles
set avatar_path = 'avatars/f3000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000001.webp'
where id = 'f3000000-0000-4000-8000-000000000002';

select extensions.ok(
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_path'),
  'profiles persist avatar storage paths'
);
select extensions.ok(
  (select public from storage.buckets where id = 'profile-media')
    and (select file_size_limit = 5242880 from storage.buckets where id = 'profile-media'),
  'profile media bucket is public and enforces a 5 MB upload limit'
);
select extensions.ok(
  exists (select 1 from pg_catalog.pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'profile_media_insert_own_or_tenant_logo'),
  'profile media uploads are guarded by ownership policies'
);
select extensions.ok(
  exists (select 1 from pg_catalog.pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'profile_media_delete_own_or_tenant_logo'),
  'profile media deletion is guarded by ownership policies'
);
select extensions.ok(
  (select prosecdef from pg_catalog.pg_proc where oid = 'public.set_own_profile_avatar(text)'::regprocedure)
    and (select prosecdef from pg_catalog.pg_proc where oid = 'public.set_own_tenant_logo(text)'::regprocedure)
    and pg_catalog.has_function_privilege('authenticated', 'public.set_own_profile_avatar(text)', 'EXECUTE')
    and pg_catalog.has_function_privilege('authenticated', 'public.set_own_tenant_logo(text)', 'EXECUTE')
    and not pg_catalog.has_function_privilege('anon', 'public.set_own_profile_avatar(text)', 'EXECUTE')
    and not pg_catalog.has_function_privilege('anon', 'public.set_own_tenant_logo(text)', 'EXECUTE'),
  'avatar and tenant logo updates use protected security-definer RPCs'
);
select extensions.ok(
  not exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('profile_media_insert_tenant_loading_icon', 'profile_media_delete_tenant_loading_icon')
  ),
  'loading icon storage policies are retired'
);
select extensions.is(
  pg_catalog.to_regprocedure('public.set_own_tenant_loading_icon(text)')::text,
  null,
  'loading icon RPC is retired'
);
select extensions.ok(
  not exists (select 1 from public.tenants where theme ? 'loadingIconUrl'),
  'tenant themes no longer retain loading icon URLs'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select extensions.throws_ok(
  $$select public.set_own_profile_avatar('avatars/f3000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000001.webp')$$,
  '42501', null,
  'anonymous callers cannot set a student avatar'
);
select extensions.throws_ok(
  $$select public.set_own_tenant_logo('https://example.test/storage/v1/object/public/profile-media/logos/f2000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001.png')$$,
  '42501', null,
  'anonymous callers cannot set a tenant logo'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000001', true);
select extensions.is(public.set_own_coach_whatsapp_number('573001234567'), '573001234567', 'coach can save an international WhatsApp number');
select extensions.throws_ok($$select public.set_own_tenant_whatsapp_avatar('whatsapp-avatars/f2000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001.png')$$, '22023', 'invalid_avatar_path', 'avatar must exist in storage');
select extensions.is((select count(*) from public.get_own_coach_whatsapp_contact()), 0::bigint, 'coach cannot read student contact');
select extensions.throws_ok($$select public.set_own_coach_whatsapp_number('+57 300')$$, '22023', 'invalid_whatsapp_number', 'invalid WhatsApp numbers are rejected');
select extensions.is(public.set_own_coach_whatsapp_number(''), null, 'coach can remove their WhatsApp number');
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000002', true);
select extensions.throws_ok($$select public.set_own_coach_whatsapp_number('573001234567')$$, '42501', 'not_authorized', 'students cannot change a coach WhatsApp number');
select extensions.throws_ok($$select public.set_own_tenant_whatsapp_avatar(null)$$, '42501', 'not_authorized', 'students cannot change a gym avatar');
select extensions.is((select count(*) from public.get_own_coach_whatsapp_contact()), 0::bigint, 'student sees no contact without a number');
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000001', true);
select public.set_own_coach_whatsapp_number('573001234567');
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000002', true);
select extensions.is((select whatsapp_number from public.get_own_coach_whatsapp_contact()), '573001234567', 'student sees assigned coach number');
select extensions.is((select coach_name from public.get_own_coach_whatsapp_contact()), 'Media Coach', 'student sees assigned coach name');
select extensions.is((select avatar_path from public.get_own_coach_whatsapp_contact()), null, 'avatar is optional');
select extensions.is(public.get_own_tenant_whatsapp_avatar(), null, 'student cannot read coach avatar configuration');
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000001', true);
select extensions.lives_ok($$insert into storage.objects (bucket_id, name) values ('profile-media', 'whatsapp-avatars/f2000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001.png')$$, 'coach can upload a PNG for their gym');
select extensions.is(public.set_own_tenant_whatsapp_avatar('whatsapp-avatars/f2000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001.png'), 'whatsapp-avatars/f2000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001.png', 'coach can assign the uploaded gym avatar');
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000003', true);
select extensions.is(public.get_own_tenant_whatsapp_avatar(), 'whatsapp-avatars/f2000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001.png', 'another coach at the same gym sees the shared avatar');
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000004', true);
select extensions.is(public.get_own_tenant_whatsapp_avatar(), null, 'another gym does not inherit the avatar');
select extensions.throws_ok($$select public.set_own_tenant_whatsapp_avatar('whatsapp-avatars/f2000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001.png')$$, '22023', 'invalid_avatar_path', 'another gym cannot assign this avatar');
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000002', true);
select extensions.is((select avatar_path from public.get_own_coach_whatsapp_contact()), 'whatsapp-avatars/f2000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001.png', 'student sees their gym avatar');
select extensions.throws_ok($$insert into storage.objects (bucket_id, name) values ('profile-media', 'whatsapp-avatars/f2000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.png')$$, '42501', null, 'student cannot upload a gym avatar');
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000001', true);
select extensions.throws_ok(
  $$select public.set_own_profile_avatar('avatars/f3000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000001.webp')$$,
  '42501', 'not_authorized',
  'a coach cannot set a student avatar'
);
select extensions.is(
  (select has_active_programming from public.list_coach_personalized_members() where member_id = 'f3000000-0000-4000-8000-000000000002'),
  false,
  'a past single-day assignment is not reported as active programming'
);
select extensions.is(
  (select avatar_path from public.list_coach_personalized_members() where member_id = 'f3000000-0000-4000-8000-000000000002'),
  'avatars/f3000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000001.webp',
  'coach roster exposes only its invited student avatar path'
);
reset role;
insert into public.routine_assignments (
  id, tenant_id, coach_id, student_id, scheduled_for, title, status, published_at
)
values (
  'f4000000-0000-4000-8000-000000000002',
  'f2000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000002',
  (pg_catalog.timezone('UTC', pg_catalog.now()))::date + 1,
  'Rutina futura', 'PUBLISHED', pg_catalog.now()
);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000001', true);
select extensions.is(
  (select has_active_programming from public.list_coach_personalized_members() where member_id = 'f3000000-0000-4000-8000-000000000002'),
  true,
  'a future published single-day assignment is reported as active programming'
);

reset role;
delete from public.routine_assignments where id = 'f4000000-0000-4000-8000-000000000002';
insert into public.routine_assignments (
  id, tenant_id, coach_id, student_id, scheduled_for, title, status, published_at,
  program_mode, additional_cycle_repeats, cycle_day_count
)
values (
  'f4000000-0000-4000-8000-000000000003',
  'f2000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000002',
  null, 'Ciclo activo', 'PUBLISHED', pg_catalog.now(), 'CYCLE', 0, 1
);
insert into public.routine_assignment_days (id, tenant_id, assignment_id, position, title)
values (
  'f5000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'f4000000-0000-4000-8000-000000000003', 1, 'Día 1'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000001', true);
select extensions.is(
  (select has_active_programming from public.list_coach_personalized_members() where member_id = 'f3000000-0000-4000-8000-000000000002'),
  true,
  'a cycle slot with remaining attempts is reported as active programming'
);

reset role;
insert into public.routine_executions (
  id, tenant_id, assignment_id, cycle_day_id, student_id, execution_date,
  slot_attempt, status, closed_at
)
values (
  'f6000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'f4000000-0000-4000-8000-000000000003',
  'f5000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000002',
  (pg_catalog.timezone('UTC', pg_catalog.now()))::date - 1,
  1, 'CLOSED_INCOMPLETE', pg_catalog.now()
);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000001', true);
select extensions.is(
  (select has_active_programming from public.list_coach_personalized_members() where member_id = 'f3000000-0000-4000-8000-000000000002'),
  false,
  'a cycle with all attempts consumed is not reported as active programming'
);

select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000002', true);
select extensions.throws_ok(
  $$select public.set_own_tenant_logo('https://example.test/storage/v1/object/public/profile-media/logos/f2000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001.png')$$,
  '42501', 'not_authorized',
  'a student cannot change the tenant logo'
);
select * from extensions.finish();
rollback;