begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

insert into public.tenants (id, name, subdomain, status)
values ('f2000000-0000-4000-8000-000000000001', 'Media Gym', 'media-gym', 'ACTIVE');

insert into auth.users (id, email)
values
  ('f3000000-0000-4000-8000-000000000001', 'media-coach@example.test'),
  ('f3000000-0000-4000-8000-000000000002', 'media-student@example.test');

insert into public.profiles (id, tenant_id, role, status, full_name, coach_id)
values
  ('f3000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'Media Coach', null),
  ('f3000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Media Student', 'f3000000-0000-4000-8000-000000000001');

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
    and (select prosecdef from pg_catalog.pg_proc where oid = 'public.set_own_tenant_logo(text)'::regprocedure),
  'avatar and tenant logo updates use security-definer RPCs'
);
select extensions.ok(
  pg_catalog.has_function_privilege('authenticated', 'public.set_own_profile_avatar(text)', 'EXECUTE')
    and pg_catalog.has_function_privilege('authenticated', 'public.set_own_tenant_logo(text)', 'EXECUTE')
    and not pg_catalog.has_function_privilege('anon', 'public.set_own_profile_avatar(text)', 'EXECUTE')
    and not pg_catalog.has_function_privilege('anon', 'public.set_own_tenant_logo(text)', 'EXECUTE'),
  'only authenticated callers can execute media update RPCs'
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
select extensions.throws_ok(
  $$select public.set_own_profile_avatar('avatars/f3000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000001.webp')$$,
  '42501', 'not_authorized',
  'a coach cannot set a student avatar'
);
select extensions.is(
  (select avatar_path from public.list_coach_personalized_members() where member_id = 'f3000000-0000-4000-8000-000000000002'),
  'avatars/f3000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000001.webp',
  'coach roster exposes only its invited student avatar path'
);

select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000002', true);
select extensions.throws_ok(
  $$select public.set_own_tenant_logo('https://example.test/storage/v1/object/public/profile-media/logos/f2000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001.png')$$,
  '42501', 'not_authorized',
  'a student cannot change the tenant logo'
);

select * from extensions.finish();
rollback;