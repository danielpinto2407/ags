-- CU-00 / CU-01: tenant resolution and tenant/profile RLS.
-- Run locally with: npx supabase test db
-- All fixture rows are rolled back; no development users or tenants persist.

begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(56);

insert into public.tenants (id, name, subdomain, status)
values
  ('d0000000-0000-4000-8000-000000000001', 'AGS GluteHouse RLS Test', 'rls-ags', 'ACTIVE'),
  ('d0000000-0000-4000-8000-000000000002', 'Power Gym', 'powergym', 'ACTIVE'),
  ('d0000000-0000-4000-8000-000000000003', 'Paused Gym RLS Test', 'rls-pausedgym', 'SUSPENDED');

insert into auth.users (id)
values
  ('d1000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000002'),
  ('d1000000-0000-4000-8000-000000000003'),
  ('d1000000-0000-4000-8000-000000000004'),
  ('d1000000-0000-4000-8000-000000000005'),
  ('d1000000-0000-4000-8000-000000000006'),
  ('d1000000-0000-4000-8000-000000000007'),
  ('d1000000-0000-4000-8000-000000000008'),
  ('d1000000-0000-4000-8000-000000000009');

update auth.users
set email = case id
  when 'd1000000-0000-4000-8000-000000000002' then 'student-ags@example.test'
  when 'd1000000-0000-4000-8000-000000000005' then 'inactive-ags@example.test'
  when 'd1000000-0000-4000-8000-000000000008' then 'first-coach-member@example.test'
  when 'd1000000-0000-4000-8000-000000000009' then 'second-coach-member@example.test'
  else email
end
where id in (
  'd1000000-0000-4000-8000-000000000002',
  'd1000000-0000-4000-8000-000000000005',
  'd1000000-0000-4000-8000-000000000008',
  'd1000000-0000-4000-8000-000000000009'
);

insert into public.profiles (id, tenant_id, role, status, full_name)
values
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Coach AGS'),
  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Student AGS'),
  ('d1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'coach_admin', 'ACTIVE', 'Coach Power Gym'),
  ('d1000000-0000-4000-8000-000000000004', null, 'super_admin', 'ACTIVE', 'Platform Admin'),
  ('d1000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 'user_personalized', 'INACTIVE', 'Inactive Student'),
  ('d1000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000003', 'coach_admin', 'ACTIVE', 'Coach Suspended Tenant'),
  ('d1000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Second Coach AGS');

update public.profiles
set coach_id = 'd1000000-0000-4000-8000-000000000001'
where id in (
  'd1000000-0000-4000-8000-000000000002',
  'd1000000-0000-4000-8000-000000000005'
);

insert into public.profiles (id, tenant_id, role, status, full_name, coach_id)
values
  ('d1000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'First Coach Member', 'd1000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Second Coach Member', 'd1000000-0000-4000-8000-000000000007');

select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.tenants'::regclass),
  'RLS is enabled on tenants'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);
select extensions.is(
  (select count(*)::integer from public.tenants where subdomain = 'ags'),
  1,
  'local seed creates one AGS tenant'
);
select extensions.ok(
  exists (
    select 1
    from public.resolve_tenant_by_subdomain('ags') as resolved
    where resolved.tenant_id = 'a0000000-0000-4000-8000-000000000001'
      and resolved.tenant_name = 'AGS GluteHouse (Local)'
      and resolved.tenant_status = 'ACTIVE'
      and resolved.theme ->> 'primaryColor' = '#7b2545'
  ),
  'public resolver returns the seeded AGS tenant and its configured theme'
);
select extensions.ok(
  exists (
    select 1
    from public.resolve_tenant_by_subdomain('pausedgym') as resolved
    where resolved.tenant_status = 'SUSPENDED'
  ),
  'public resolver exposes the suspended state for the seeded blocked-screen tenant'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select extensions.throws_ok(
  $$select id from public.tenants$$,
  '42501',
  null,
  'anonymous clients cannot read the tenants table directly'
);
select extensions.throws_ok(
  $$select id from public.profiles$$,
  '42501',
  null,
  'anonymous clients cannot read the profiles table'
);
select extensions.throws_ok(
  $$select * from public.list_coach_personalized_members()$$,
  '42501',
  null,
  'anonymous clients cannot read coach member emails'
);
select extensions.is(
  (select count(*)::integer from public.resolve_tenant_by_subdomain('rls-ags')),
  1,
  'public resolver finds a registered tenant by subdomain'
);
select extensions.ok(
  exists (
    select 1
    from public.resolve_tenant_by_subdomain('rls-ags') as resolved
    where resolved.tenant_name = 'AGS GluteHouse RLS Test'
      and resolved.tenant_status = 'ACTIVE'
      and resolved.theme ? 'primaryColor'
  ),
  'public resolver returns only the expected public tenant metadata'
);
select extensions.is(
  (select count(*)::integer from public.resolve_tenant_by_subdomain('unknown-gym')),
  0,
  'public resolver returns no result for an unknown tenant'
);
select extensions.ok(
  exists (
    select 1
    from public.resolve_tenant_by_subdomain('  AGS  ') as resolved
    where resolved.tenant_subdomain = 'ags'
  ),
  'public resolver normalizes whitespace and case'
);
select extensions.is(
  (select count(*)::integer from public.resolve_tenant_by_subdomain('INVALID_SUBDOMAIN')),
  0,
  'public resolver rejects malformed subdomains'
);
select extensions.ok(
  exists (
    select 1
    from public.resolve_tenant_by_subdomain('rls-pausedgym') as resolved
    where resolved.tenant_status = 'SUSPENDED'
  ),
  'public resolver reports suspended tenant status for the pre-login blocked screen'
);
select extensions.is(
  (select count(*)::integer from public.resolve_tenant_by_subdomain(repeat('a', 64))),
  0,
  'public resolver rejects input longer than a DNS label'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);

select extensions.is(
  (select count(*)::integer from public.profiles),
  1,
  'a student can see only their own profile'
);
select extensions.ok(
  exists (
    select 1 from public.profiles
    where id = 'd1000000-0000-4000-8000-000000000002'
  ),
  'a student can read their own profile'
);
select extensions.is(
  (select count(*)::integer from public.profiles where tenant_id = 'd0000000-0000-4000-8000-000000000002'),
  0,
  'a student cannot see profiles from another tenant'
);
select extensions.is(
  (select count(*)::integer from public.profiles where id = 'd1000000-0000-4000-8000-000000000008'),
  0,
  'a student cannot see another member in the same tenant'
);
select extensions.is(
  (select count(*)::integer from public.tenants),
  1,
  'a student can see only their own tenant'
);

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select extensions.is(
  (select count(*)::integer from public.profiles),
  4,
  'a coach sees only their own profile and personalized members they invited'
);
select extensions.is(
  (select count(*)::integer from public.list_coach_personalized_members()),
  3,
  'coach roster RPC returns only members invited by that coach, including inactive members'
);
select extensions.is(
  (select email from public.list_coach_personalized_members() where member_id = 'd1000000-0000-4000-8000-000000000008'),
  'first-coach-member@example.test',
  'coach roster RPC returns the auth email for an owned member'
);
select extensions.is(
  (select count(*)::integer from public.profiles where tenant_id = 'd0000000-0000-4000-8000-000000000002'),
  0,
  'a coach cannot see profiles from another tenant'
);
select extensions.is(
  (select count(*)::integer from public.profiles where id = 'd1000000-0000-4000-8000-000000000009'),
  0,
  'a coach cannot see a same-tenant member invited by another coach'
);
select extensions.is(
  (select count(*)::integer from public.tenants),
  1,
  'a coach can see only their own tenant'
);

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000007', true);
select extensions.is(
  (select count(*)::integer from public.list_coach_personalized_members()),
  1,
  'second coach roster RPC does not expose another coach member or email'
);
select extensions.is(
  (select count(*)::integer from public.profiles),
  2,
  'a second coach sees only their own profile and invited member'
);
select extensions.is(
  (select count(*)::integer from public.profiles where id = 'd1000000-0000-4000-8000-000000000002'),
  0,
  'a second coach cannot see the first coach member in the same tenant'
);

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000005', true);
select extensions.is(
  (select count(*)::integer from public.profiles),
  1,
  'an inactive profile can read only itself to learn its account status'
);
select extensions.is(
  (select count(*)::integer from public.tenants),
  0,
  'an inactive profile cannot read tenant data'
);
select extensions.ok(
  not (select private.current_profile_is_active()),
  'the RLS helper identifies an inactive profile'
);

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000006', true);
select extensions.is(
  (select count(*)::integer from public.profiles),
  1,
  'a coach in a suspended tenant can read only their own profile'
);
select extensions.is(
  (select count(*)::integer from public.tenants),
  0,
  'a profile in a suspended tenant cannot read tenant data'
);
select extensions.ok(
  (select private.current_profile_is_active()),
  'the suspended-tenant coach profile itself remains active'
);
select extensions.ok(
  not (select private.current_profile_tenant_is_active()),
  'the RLS helper blocks a suspended tenant'
);

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000004', true);
select extensions.is(
  (select count(*)::integer from public.tenants where id in (
    'd0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000002',
    'd0000000-0000-4000-8000-000000000003'
  )),
  3,
  'a super admin can see all test tenants across organizations'
);
select extensions.is(
  (select count(*)::integer from public.profiles where id in (
    'd1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000003',
    'd1000000-0000-4000-8000-000000000004',
    'd1000000-0000-4000-8000-000000000005',
    'd1000000-0000-4000-8000-000000000006',
    'd1000000-0000-4000-8000-000000000007',
    'd1000000-0000-4000-8000-000000000008',
    'd1000000-0000-4000-8000-000000000009'
  )),
  9,
  'a super admin can see every profile from this test fixture'
);
select extensions.throws_ok(
  $$insert into public.tenants (name, subdomain) values ('Client Tenant', 'client-tenant')$$,
  '42501',
  null,
  'authenticated clients cannot create tenants directly'
);
select extensions.throws_ok(
  $$update public.profiles set role = 'super_admin' where id = 'd1000000-0000-4000-8000-000000000002'$$,
  '42501',
  null,
  'authenticated clients cannot modify profile roles'
);
select extensions.throws_ok(
  $$update public.tenants set status = 'SUSPENDED' where id = 'd0000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'authenticated clients cannot suspend tenants'
);

reset role;
set local role service_role;
update public.tenants
set max_clients = 3
where id = 'd0000000-0000-4000-8000-000000000001';
select extensions.is(
  public.set_personalized_member_status(
    'd0000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000008',
    'INACTIVE'
  ),
  'd1000000-0000-4000-8000-000000000008'::uuid,
  'coach can deactivate their own invited member'
);
select extensions.is(
  (select status::text from public.profiles where id = 'd1000000-0000-4000-8000-000000000008'),
  'INACTIVE',
  'deactivation marks the member inactive'
);
select extensions.ok(
  exists (
    select 1 from public.profiles p
    where p.id = 'd1000000-0000-4000-8000-000000000008'
      and p.coach_id = 'd1000000-0000-4000-8000-000000000001'
      and p.full_name = 'First Coach Member'
  ),
  'deactivation preserves the member profile, coach association, and Auth identity'
);
select extensions.throws_ok(
  $$select public.set_personalized_member_status('d0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000009', 'INACTIVE')$$,
  '42501',
  'member_not_owned',
  'coach cannot deactivate a same-tenant member invited by another coach'
);

select extensions.throws_ok(
  $$select public.set_personalized_member_status('d0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000007', 'd1000000-0000-4000-8000-000000000008', 'INACTIVE')$$,
  '42501',
  'member_not_owned',
  'second coach cannot deactivate the first coach member'
);

select extensions.is(
  public.set_personalized_member_status(
    'd0000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000008',
    'INACTIVE'
  ),
  'd1000000-0000-4000-8000-000000000008'::uuid,
  'setting an invited member to their current status is idempotent'
);

select extensions.throws_ok(
  $$select public.set_personalized_member_status('d0000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000009', 'INACTIVE')$$,
  '42501',
  'not_authorized',
  'coach cannot deactivate a member through a different tenant argument'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000008', true);
select extensions.is(
  (select count(*)::integer from public.profiles),
  1,
  'deactivated member can still read their own profile to learn account status'
);
select extensions.is(
  (select count(*)::integer from public.tenants),
  0,
  'deactivated member can no longer read gym programming data'
);

reset role;
set local role service_role;
update public.tenants set max_clients = 3 where id = 'd0000000-0000-4000-8000-000000000001';
select extensions.is(
  public.set_personalized_member_status(
    'd0000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000008',
    'ACTIVE'
  ),
  'd1000000-0000-4000-8000-000000000008'::uuid,
  'coach can reactivate their own invited member'
);
select extensions.is(
  (select status::text from public.profiles where id = 'd1000000-0000-4000-8000-000000000008'),
  'ACTIVE',
  'reactivation restores active status'
);
select extensions.ok(
  exists (
    select 1 from public.profiles
    where id = 'd1000000-0000-4000-8000-000000000008'
      and coach_id = 'd1000000-0000-4000-8000-000000000001'
  ),
  'reactivation preserves the inviting coach relationship'
);
select extensions.throws_ok(
  $$select public.set_personalized_member_status('d0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000007', 'd1000000-0000-4000-8000-000000000008', 'INACTIVE')$$,
  '42501',
  'member_not_owned',
  'another coach cannot toggle this member status'
);

select extensions.is(
  public.set_personalized_member_status(
    'd0000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000008',
    'ACTIVE'
  ),
  'd1000000-0000-4000-8000-000000000008'::uuid,
  'setting a member to their current status is idempotent'
);
update public.tenants set max_clients = 2 where id = 'd0000000-0000-4000-8000-000000000001';
select public.set_personalized_member_status(
  'd0000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000008',
  'INACTIVE'
);
select extensions.is(
  public.set_personalized_member_status(
    'd0000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000008',
    'ACTIVE'
  ),
  'd1000000-0000-4000-8000-000000000008'::uuid,
  'personalized member reactivation is not limited by max_clients'
);

select * from extensions.finish();
rollback;
