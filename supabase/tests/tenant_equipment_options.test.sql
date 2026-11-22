begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into public.tenants (id, name, subdomain, status)
values
  ('ea000000-0000-4000-8000-000000000001', 'Equipment Gym A', 'equipment-a', 'ACTIVE'),
  ('ea000000-0000-4000-8000-000000000002', 'Equipment Gym B', 'equipment-b', 'ACTIVE');

insert into auth.users (id, email)
values
  ('e0100000-0000-4000-8000-000000000001', 'equipment-superadmin@example.test'),
  ('e0100000-0000-4000-8000-000000000002', 'equipment-coach-a@example.test');

insert into public.profiles (id, tenant_id, role, status, full_name)
values
  ('e0100000-0000-4000-8000-000000000001', null, 'super_admin', 'ACTIVE', 'Equipment Superadmin'),
  ('e0100000-0000-4000-8000-000000000002', 'ea000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Equipment Coach A');

select extensions.is(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.tenant_equipment_options'::pg_catalog.regclass),
  true,
  'RLS is enabled on tenant equipment options'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0100000-0000-4000-8000-000000000001', true);

insert into public.tenant_equipment_options (tenant_id, name, position)
values ('ea000000-0000-4000-8000-000000000001', 'Prensa local A', 10);

select extensions.is(
  (select name from public.tenant_equipment_options
   where tenant_id = 'ea000000-0000-4000-8000-000000000001' and name = 'Prensa local A'),
  'Prensa local A',
  'superadmin can create an option for a tenant'
);

update public.tenant_equipment_options
set archived_at = pg_catalog.now()
where tenant_id = 'ea000000-0000-4000-8000-000000000001' and name = 'Prensa local A';

select extensions.is(
  (select archived_at is not null from public.tenant_equipment_options
   where tenant_id = 'ea000000-0000-4000-8000-000000000001' and name = 'Prensa local A'),
  true,
  'superadmin can archive an option'
);

select extensions.is(
  (select count(*)::integer from public.tenant_equipment_options
   where tenant_id = 'ea000000-0000-4000-8000-000000000002'),
  9,
  'other tenant receives its own backfilled options only'
);

select extensions.is(
  (select count(*)::integer from public.tenant_equipment_options
   where tenant_id = 'ea000000-0000-4000-8000-000000000001'),
  10,
  'tenant A retains the seed plus its custom option'
);

select set_config('request.jwt.claim.sub', 'e0100000-0000-4000-8000-000000000002', true);
select extensions.throws_ok(
  $$insert into public.tenant_equipment_options (tenant_id, name, position)
    values ('ea000000-0000-4000-8000-000000000001', 'No permitido', 11);$$,
  '42501', null,
  'coach cannot create tenant equipment options'
);

select extensions.throws_ok(
  $$insert into public.tenant_equipment_options (tenant_id, name, position)
    values ('ea000000-0000-4000-8000-000000000002', 'Cross tenant', 10);$$,
  '42501', null,
  'coach cannot manage another tenant equipment options'
);

select * from extensions.finish();
rollback;
