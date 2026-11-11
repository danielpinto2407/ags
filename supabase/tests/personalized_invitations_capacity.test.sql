-- CU-01B: invitation onboarding and personalized membership capacity controls.
-- Run locally with: npx supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(33);

insert into public.tenants (id, name, subdomain, status, max_clients)
values
  ('e0000000-0000-4000-8000-000000000001', 'CU-01B Gym', 'cu01b-gym', 'ACTIVE', 2),
  ('e0000000-0000-4000-8000-000000000002', 'CU-01B Paused Gym', 'cu01b-paused', 'SUSPENDED', 2),
  ('e0000000-0000-4000-8000-000000000003', 'CU-01B Other Gym', 'cu01b-other', 'ACTIVE', 2);

insert into auth.users (id, email)
values
  ('e1000000-0000-4000-8000-000000000001', 'coach@example.test'),
  ('e1000000-0000-4000-8000-000000000002', 'active@example.test'),
  ('e1000000-0000-4000-8000-000000000003', 'inactive@example.test'),
  ('e1000000-0000-4000-8000-000000000004', 'other-coach@example.test'),
  ('e1000000-0000-4000-8000-000000000005', 'paused-coach@example.test'),
  ('e1000000-0000-4000-8000-000000000006', 'available@example.test'),
  ('e1000000-0000-4000-8000-000000000007', 'wrong-email@example.test');

insert into public.profiles (id, tenant_id, role, status, full_name)
values
  ('e1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'coach_admin', 'ACTIVE', 'CU01B Coach'),
  ('e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'user_personalized', 'ACTIVE', 'Active Member'),
  ('e1000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001', 'user_personalized', 'INACTIVE', 'Inactive Member'),
  ('e1000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000003', 'coach_admin', 'ACTIVE', 'Other Tenant Coach'),
  ('e1000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000002', 'coach_admin', 'ACTIVE', 'Paused Tenant Coach');

select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.tenant_invitations'::pg_catalog.regclass),
  'RLS is enabled on tenant invitations'
);
select extensions.is(
  (select column_default from information_schema.columns where table_schema = 'public' and table_name = 'tenants' and column_name = 'max_clients'),
  '1',
  'new tenants default to at least one personalized-user slot'
);
select extensions.throws_ok(
  $$update public.tenants set max_clients = 0 where id = 'e0000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'tenant capacity cannot be set to zero'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select extensions.throws_ok(
  $$select id from public.tenant_invitations$$,
  '42501',
  null,
  'anonymous clients cannot read invitations'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
select extensions.throws_ok(
  $$select id from public.tenant_invitations$$,
  '42501',
  null,
  'authenticated clients cannot read invitation records directly'
);
select extensions.throws_ok(
  $$select public.prepare_personalized_invitation('e0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'new@example.test')$$,
  '42501',
  null,
  'authenticated clients cannot invoke the privileged onboarding function'
);
reset role;

set local role service_role;
select extensions.is(
  public.prepare_personalized_invitation(
    'e0000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    '  New.Member@Example.Test  '
  ) is not null,
  true,
  'inactive profiles do not consume capacity and trusted server normalizes invite email'
);

select extensions.is(
  (
    select count(*)::integer
    from public.tenant_invitations
    where tenant_id = 'e0000000-0000-4000-8000-000000000001'
      and email = 'new.member@example.test'
      and status = 'PENDING'
  ),
  1,
  'one normalized pending invitation is stored'
);

select extensions.ok(
  (
    select expires_at <= created_at + interval '1 hour'
      and expires_at > pg_catalog.now()
    from public.tenant_invitations
    where tenant_id = 'e0000000-0000-4000-8000-000000000001'
      and email = 'new.member@example.test'
      and status = 'PENDING'
  ),
  'new invitation links expire within the one-hour Auth OTP lifetime'
);

select extensions.throws_ok(
  $$select public.prepare_personalized_invitation('e0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'active@example.test')$$,
  'P0001',
  'already_member',
  'an email already active as a personalized member cannot be invited twice'
);

select extensions.is(
  public.prepare_personalized_invitation(
    'e0000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    'NEW.MEMBER@example.test'
  ),
  (
    select id
    from public.tenant_invitations
    where tenant_id = 'e0000000-0000-4000-8000-000000000001'
      and email = 'new.member@example.test'
      and status = 'PENDING'
  ),
  'a repeat invite reuses its pending onboarding record instead of consuming another member place'
);

select extensions.throws_ok(
  $$select public.prepare_personalized_invitation('e0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'full@example.test')$$,
  'P0001',
  'capacity_reached',
  'active members plus pending invitations cannot exceed tenant capacity'
);

update public.tenants
set max_clients = 3
where id = 'e0000000-0000-4000-8000-000000000001';

update public.tenant_invitations
set created_at = pg_catalog.now() - interval '8 days',
    expires_at = pg_catalog.now() - interval '1 minute'
where tenant_id = 'e0000000-0000-4000-8000-000000000001'
  and email = 'new.member@example.test';

select extensions.is(
  public.prepare_personalized_invitation(
    'e0000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    'available@example.test'
  ) is not null,
  true,
  'an expired, unlinked onboarding attempt releases its temporary membership allocation'
);

select extensions.is(
  public.prepare_personalized_invitation(
    'e0000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    'failed@example.test'
  ) is not null,
  true,
  'a new onboarding attempt reserves capacity before Auth invite delivery'
);

select extensions.is(
  public.fail_personalized_invitation(
    (select id from public.tenant_invitations where email = 'failed@example.test' and status = 'PENDING')
  ),
  true,
  'trusted server can mark an unlinked failed Auth invite'
);

select extensions.is(
  (select status from public.tenant_invitations where email = 'failed@example.test'),
  'FAILED',
  'failed Auth invitation is no longer pending'
);

select extensions.is(
  public.prepare_personalized_invitation(
    'e0000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    'after-failure@example.test'
  ) is not null,
  true,
  'a failed unlinked invitation releases its temporary member place'
);

select extensions.throws_ok(
  $$select public.prepare_personalized_invitation('e0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000004', 'wrong-tenant@example.test')$$,
  '42501',
  'not_authorized',
  'a coach from another tenant cannot start member onboarding'
);

select extensions.throws_ok(
  $$select public.prepare_personalized_invitation('e0000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000005', 'paused@example.test')$$,
  'P0001',
  'tenant_inactive',
  'invitations cannot be issued by a suspended tenant'
);

select extensions.throws_ok(
  $$select public.prepare_personalized_invitation('e0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'not-an-email')$$,
  '22023',
  'invalid_email',
  'invalid invite email is rejected by the database boundary'
);

select extensions.is(
  (
    select count(*)::integer
    from public.tenant_invitations
    where tenant_id = 'e0000000-0000-4000-8000-000000000001'
      and status = 'PENDING'
      and expires_at > pg_catalog.now()
  ),
  2,
  'only active pending onboarding records remain after expiry and failed delivery'
);

select extensions.throws_ok(
  $$select public.link_personalized_invitation((select id from public.tenant_invitations where email = 'available@example.test' and status = 'PENDING'), 'e1000000-0000-4000-8000-000000000007')$$,
  '42501',
  'invite_email_mismatch',
  'an Auth identity with a different email cannot be linked to the invitation'
);

select extensions.is(
  public.link_personalized_invitation(
    (select id from public.tenant_invitations where email = 'available@example.test' and status = 'PENDING'),
    'e1000000-0000-4000-8000-000000000006'
  ),
  (select id from public.tenant_invitations where email = 'available@example.test' and status = 'PENDING'),
  'trusted onboarding links the Auth identity only when its email matches'
);

update public.tenant_invitations
set auth_user_id = 'e1000000-0000-4000-8000-000000000007'
where email = 'available@example.test'
  and status = 'PENDING';

select extensions.throws_ok(
  $$select public.accept_personalized_invitation((select id from public.tenant_invitations where email = 'available@example.test' and status = 'PENDING'), 'e1000000-0000-4000-8000-000000000007', 'Wrong Email Member')$$,
  '42501',
  'invite_email_mismatch',
  'acceptance independently checks the authenticated account email'
);

update public.tenant_invitations
set auth_user_id = 'e1000000-0000-4000-8000-000000000006'
where email = 'available@example.test'
  and status = 'PENDING';

update public.tenant_invitations
set created_at = pg_catalog.now() - interval '2 hours',
    expires_at = pg_catalog.now() - interval '1 minute'
where email = 'available@example.test'
  and status = 'PENDING';

select extensions.throws_ok(
  $$select public.accept_personalized_invitation((select id from public.tenant_invitations where email = 'available@example.test' and status = 'PENDING'), 'e1000000-0000-4000-8000-000000000006', 'Invited Member')$$,
  'P0001',
  'invitation_expired',
  'an expired invitation cannot be accepted even by its linked Auth identity'
);

select extensions.is(
  public.prepare_personalized_invitation(
    'e0000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    'available@example.test'
  ),
  (select id from public.tenant_invitations where email = 'available@example.test'),
  'a coach resend reactivates the same unaccepted Auth identity with a fresh link'
);

select extensions.ok(
  exists (
    select 1 from public.tenant_invitations
    where email = 'available@example.test'
      and status = 'PENDING'
      and auth_user_id = 'e1000000-0000-4000-8000-000000000006'
      and expires_at > pg_catalog.now()
  ),
  'reissued invitation keeps the same Auth identity and a fresh expiry'
);

select extensions.is(
  public.accept_personalized_invitation(
    (select id from public.tenant_invitations where email = 'available@example.test' and status = 'PENDING'),
    'e1000000-0000-4000-8000-000000000006',
    'Invited Member'
  ),
  'e1000000-0000-4000-8000-000000000006'::uuid,
  'the invitee activates the account and receives a persistent profile'
);

select extensions.ok(
  exists (
    select 1 from public.profiles
    where id = 'e1000000-0000-4000-8000-000000000006'
      and tenant_id = 'e0000000-0000-4000-8000-000000000001'
      and role = 'user_personalized'
      and status = 'ACTIVE'
        and full_name = 'Invited Member'
        and coach_id = 'e1000000-0000-4000-8000-000000000001'
  ),
      'accepted invitation creates an active member linked to the inviting coach and their tenant'
);

select extensions.ok(
  exists (
    select 1 from public.tenant_invitations
    where email = 'available@example.test'
      and status = 'ACCEPTED'
      and accepted_at is not null
      and auth_user_id = 'e1000000-0000-4000-8000-000000000006'
  ),
  'acceptance is recorded against the invited Auth identity'
);

select extensions.throws_ok(
  $$select public.accept_personalized_invitation((select id from public.tenant_invitations where email = 'available@example.test'), 'e1000000-0000-4000-8000-000000000006', 'Invited Member')$$,
  'P0001',
  'invitation_not_pending',
  'an accepted invitation cannot be consumed a second time'
);

update public.tenant_invitations
set created_at = pg_catalog.now() - interval '8 days',
    expires_at = pg_catalog.now() - interval '1 minute'
where email = 'available@example.test';

select extensions.is(
  (select status from public.tenant_invitations where email = 'available@example.test'),
  'ACCEPTED',
  'an expired email link does not expire an accepted membership'
);

select extensions.throws_ok(
  $$select public.prepare_personalized_invitation('e0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'another@example.test')$$,
  'P0001',
  'capacity_reached',
  'accepted members continue counting against capacity until disabled'
);

select * from extensions.finish();
rollback;