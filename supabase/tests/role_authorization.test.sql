begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

insert into public.tenants (id, name, subdomain, status, features)
values ('f7000000-0000-4000-8000-000000000001', 'Role Gym', 'role-gym', 'ACTIVE', '{"personalizedRoutines":true,"groupClasses":false,"whatsappContact":true}'::jsonb);

insert into auth.users (id, email)
values
  ('f7100000-0000-4000-8000-000000000001', 'role-super@example.test'),
  ('f7100000-0000-4000-8000-000000000002', 'role-coach@example.test'),
  ('f7100000-0000-4000-8000-000000000003', 'role-student@example.test'),
  ('f7100000-0000-4000-8000-000000000004', 'role-general@example.test'),
  ('f7100000-0000-4000-8000-000000000005', 'role-inactive@example.test');

insert into public.profiles (id, tenant_id, role, status, full_name)
values
  ('f7100000-0000-4000-8000-000000000001', null, 'super_admin', 'ACTIVE', 'Role Super'),
  ('f7100000-0000-4000-8000-000000000002', 'f7000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Role Coach'),
  ('f7100000-0000-4000-8000-000000000003', 'f7000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Role Student'),
  ('f7100000-0000-4000-8000-000000000004', 'f7000000-0000-4000-8000-000000000001', 'user_general', 'ACTIVE', 'Role General'),
  ('f7100000-0000-4000-8000-000000000005', 'f7000000-0000-4000-8000-000000000001', 'coach_admin', 'INACTIVE', 'Role Inactive');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f7100000-0000-4000-8000-000000000001', true);
select extensions.is(private.current_profile_has_capability('manage_tenants'), true, 'super_admin can manage tenants');
select extensions.is(private.current_profile_has_capability('manage_routines'), false, 'super_admin cannot manage tenant routines');

select set_config('request.jwt.claim.sub', 'f7100000-0000-4000-8000-000000000002', true);
select extensions.is(private.current_profile_has_capability('manage_routines'), true, 'coach can manage routines');
select extensions.is(private.current_profile_has_capability('manage_tenants'), false, 'coach cannot manage tenants');
select extensions.is(private.current_profile_has_feature('whatsappContact'), true, 'coach reads enabled tenant feature');

select set_config('request.jwt.claim.sub', 'f7100000-0000-4000-8000-000000000003', true);
select extensions.is(private.current_profile_has_capability('view_assigned_routines'), true, 'personalized student can view assignments');
select extensions.is(private.current_profile_has_capability('manage_routines'), false, 'personalized student cannot manage routines');
select extensions.is(private.current_profile_has_feature('personalizedRoutines'), true, 'personalized feature is enabled for tenant');

select set_config('request.jwt.claim.sub', 'f7100000-0000-4000-8000-000000000004', true);
select extensions.is(private.current_profile_has_capability('discover_group_classes'), true, 'general user can discover group classes');
select extensions.is(private.current_profile_has_capability('view_assigned_routines'), false, 'general user cannot view personalized assignments');
select extensions.is(private.current_profile_has_feature('groupClasses'), false, 'disabled group-class feature is denied');

select set_config('request.jwt.claim.sub', 'f7100000-0000-4000-8000-000000000005', true);
select extensions.is(private.current_profile_has_capability('manage_routines'), false, 'inactive coach has no capabilities');
select extensions.is(private.current_profile_has_feature('whatsappContact'), false, 'inactive profile cannot read tenant feature flags');

reset role;
select * from extensions.finish();
rollback;
