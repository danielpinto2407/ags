begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

insert into public.tenants (id, name, subdomain, status)
values ('e2000000-0000-4000-8000-000000000001', 'Existing Gym', 'existing-gym', 'ACTIVE');

insert into auth.users (id, email)
values
  ('e2100000-0000-4000-8000-000000000001', 'platform-admin@example.test'),
  ('e2100000-0000-4000-8000-000000000002', 'platform-coach@example.test'),
  ('e2100000-0000-4000-8000-000000000003', 'invited-coach@example.test');

insert into public.profiles (id, tenant_id, role, status, full_name)
values
  ('e2100000-0000-4000-8000-000000000001', null, 'super_admin', 'ACTIVE', 'Platform Admin'),
  ('e2100000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Platform Coach');

insert into public.tenant_invitations (id, tenant_id, email, invited_by, auth_user_id, invitation_kind)
values ('e2200000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'invited-coach@example.test', 'e2100000-0000-4000-8000-000000000001', 'e2100000-0000-4000-8000-000000000003', 'coach_admin');

select extensions.throws_ok($$select public.accept_coach_invitation('e2200000-0000-4000-8000-000000000001', 'e2100000-0000-4000-8000-000000000003', 'Coach Nuevo', '')$$, '22023', 'invalid_whatsapp_number', 'coach invitation requires a valid WhatsApp number');
select extensions.throws_ok($$select public.accept_coach_invitation('e2200000-0000-4000-8000-000000000001', 'e2100000-0000-4000-8000-000000000003', 'Coach Nuevo', '15551234567')$$, '22023', 'invalid_whatsapp_number', 'coach invitation rejects non-Colombian numbers');
select extensions.lives_ok($$select public.accept_coach_invitation('e2200000-0000-4000-8000-000000000001', 'e2100000-0000-4000-8000-000000000003', 'Coach Nuevo', '573001234567')$$, 'coach invitation accepts a valid WhatsApp number');
select extensions.is((select whatsapp_number from public.profiles where id = 'e2100000-0000-4000-8000-000000000003'), '573001234567', 'acceptance persists the number in the coach profile');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e2100000-0000-4000-8000-000000000001', true);

select extensions.is(
  pg_catalog.pg_typeof(public.create_platform_tenant('New Gym', 'new-gym', 'A new tenant'))::text,
  'uuid',
  'superadmin can create a tenant'
);

select extensions.is(
  (select status::text from public.tenants where subdomain = 'new-gym'),
  'ACTIVE',
  'new tenant starts active'
);

select extensions.is(
  (select count(*)::integer from public.tenant_equipment_options
   where tenant_id = (select id from public.tenants where subdomain = 'new-gym')),
  9,
  'new tenant receives default equipment options'
);

select extensions.is(
  public.update_platform_tenant(
    (select id from public.tenants where subdomain = 'new-gym'),
    'Updated Gym', 'updated-gym', 'Updated description', 'SUSPENDED'
  ) is not null,
  true,
  'superadmin can update tenant profile and status'
);

select extensions.is(
  (select status::text from public.tenants where subdomain = 'updated-gym'),
  'SUSPENDED',
  'tenant status can be suspended'
);

select set_config('request.jwt.claim.sub', 'e2100000-0000-4000-8000-000000000002', true);
select extensions.throws_ok(
  $$select public.create_platform_tenant('Forbidden Gym', 'forbidden-gym', '');$$,
  '42501', 'super_admin_required',
  'coach cannot create tenants'
);

select set_config('request.jwt.claim.sub', 'e2100000-0000-4000-8000-000000000001', true);
select extensions.throws_ok(
  $$select public.create_platform_tenant('Duplicate Gym', 'existing-gym', '');$$,
  '23505', 'tenant_subdomain_taken',
  'duplicate tenant subdomain is rejected'
);

select * from extensions.finish();
rollback;
