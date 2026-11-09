-- CU-00 / CU-01: tenant resolution and tenant/profile RLS.
-- Run locally with: npx supabase test db
-- All fixture rows are rolled back; no development users or tenants persist.

begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(26);

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
  ('d1000000-0000-4000-8000-000000000004');

insert into public.profiles (id, tenant_id, role, status, full_name)
values
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Coach AGS'),
  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Student AGS'),
  ('d1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'coach_admin', 'ACTIVE', 'Coach Power Gym'),
  ('d1000000-0000-4000-8000-000000000004', null, 'super_admin', 'ACTIVE', 'Platform Admin');

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
      and resolved.theme ->> 'primaryColor' = '#ff0a78'
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
  (select count(*)::integer from public.tenants),
  1,
  'a student can see only their own tenant'
);

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select extensions.is(
  (select count(*)::integer from public.profiles),
  2,
  'a coach can see profiles within their own tenant'
);
select extensions.is(
  (select count(*)::integer from public.profiles where tenant_id = 'd0000000-0000-4000-8000-000000000002'),
  0,
  'a coach cannot see profiles from another tenant'
);
select extensions.is(
  (select count(*)::integer from public.tenants),
  1,
  'a coach can see only their own tenant'
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
  (select count(*)::integer from public.profiles),
  4,
  'a super admin can see all profiles'
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

select * from extensions.finish();
rollback;
