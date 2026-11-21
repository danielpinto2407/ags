begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into public.tenants (id, name, subdomain, status, theme)
values (
  'f7000000-0000-4000-8000-000000000001',
  'Recovery Brand Gym',
  'recovery-brand',
  'ACTIVE',
  '{"logoUrl":"https://cdn.example.test/logo-v1.png","primaryColor":"#123456","accentColor":"#abcdef","backgroundColor":"#f4eae3","surfaceColor":"#fff9f6","textColor":"#2b2528","mutedColor":"#76696d","borderColor":"#e5d8d2"}'::jsonb
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('f7000000-0000-4000-8000-000000000002', 'recovery-coach@example.test', '{"coach_setting":"preserved"}'::jsonb),
  ('f7000000-0000-4000-8000-000000000003', 'recovery-member@example.test', '{}'::jsonb);

insert into public.profiles (id, tenant_id, role, status, full_name)
values (
  'f7000000-0000-4000-8000-000000000002',
  'f7000000-0000-4000-8000-000000000001',
  'coach_admin',
  'ACTIVE',
  'Recovery Coach'
);

select extensions.is(
  (select raw_user_meta_data->>'gym_name' from auth.users where id = 'f7000000-0000-4000-8000-000000000002'),
  'Recovery Brand Gym',
  'profile creation syncs the gym name into Auth email metadata'
);
select extensions.is(
  (select raw_user_meta_data->>'gym_logo_url' from auth.users where id = 'f7000000-0000-4000-8000-000000000002'),
  'https://cdn.example.test/logo-v1.png',
  'profile creation syncs the configured gym logo into Auth email metadata'
);
select extensions.is(
  (select raw_user_meta_data->>'gym_primary_color' from auth.users where id = 'f7000000-0000-4000-8000-000000000002'),
  '#123456',
  'profile creation syncs the gym email palette into Auth metadata'
);
select extensions.is(
  (select raw_user_meta_data->>'coach_setting' from auth.users where id = 'f7000000-0000-4000-8000-000000000002'),
  'preserved',
  'branding sync preserves unrelated user metadata'
);
select extensions.ok(
  not pg_catalog.has_function_privilege('authenticated', 'private.sync_recovery_branding_for_tenant(uuid)', 'EXECUTE'),
  'authenticated clients cannot directly execute the internal metadata sync function'
);

update public.tenants
set theme = pg_catalog.jsonb_set(theme, '{logoUrl}', pg_catalog.to_jsonb('https://cdn.example.test/logo-v2.png'::text), true)
where id = 'f7000000-0000-4000-8000-000000000001';

select extensions.is(
  (select raw_user_meta_data->>'gym_logo_url' from auth.users where id = 'f7000000-0000-4000-8000-000000000002'),
  'https://cdn.example.test/logo-v2.png',
  'tenant logo changes synchronize to existing Auth users'
);

insert into public.profiles (id, tenant_id, role, status, full_name)
values (
  'f7000000-0000-4000-8000-000000000003',
  'f7000000-0000-4000-8000-000000000001',
  'user_personalized',
  'ACTIVE',
  'Recovery Member'
);

select extensions.is(
  (select raw_user_meta_data->>'gym_logo_url' from auth.users where id = 'f7000000-0000-4000-8000-000000000003'),
  'https://cdn.example.test/logo-v2.png',
  'new member profiles receive the current recovery email logo'
);

select * from extensions.finish();
rollback;
