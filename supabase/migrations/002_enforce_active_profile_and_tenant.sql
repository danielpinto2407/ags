-- Enforce CU-01 inactive profile and CU-09 suspended tenant access in RLS.
-- An inactive/suspended user may still read their own profile status so the
-- client can display the correct blocked-access message. Tenant data is denied.

begin;

create or replace function private.current_profile_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.status = 'ACTIVE'
  );
$$;

create or replace function private.current_profile_tenant_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    join public.tenants as t on t.id = p.tenant_id
    where p.id = (select auth.uid())
      and p.status = 'ACTIVE'
      and t.status = 'ACTIVE'
  );
$$;

revoke all on function private.current_profile_is_active() from public, anon;
revoke all on function private.current_profile_tenant_is_active() from public, anon;
grant execute on function private.current_profile_is_active() to authenticated;
grant execute on function private.current_profile_tenant_is_active() to authenticated;

drop policy tenants_select_same_tenant_or_super_admin on public.tenants;
create policy tenants_select_active_same_tenant_or_super_admin
  on public.tenants
  for select
  to authenticated
  using (
    (select private.current_profile_is_active())
    and (
      (select private.current_profile_role()) = 'super_admin'
      or (
        id = (select private.current_profile_tenant_id())
        and (select private.current_profile_tenant_is_active())
      )
    )
  );

drop policy profiles_select_self_coach_tenant_or_super_admin on public.profiles;
create policy profiles_select_self_or_active_authorized_tenant
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (
      (select private.current_profile_is_active())
      and (
        (select private.current_profile_role()) = 'super_admin'
        or (
          (select private.current_profile_role()) = 'coach_admin'
          and (select private.current_profile_tenant_is_active())
          and tenant_id = (select private.current_profile_tenant_id())
        )
      )
    )
  );

comment on function private.current_profile_is_active() is
  'True only when the authenticated user has an ACTIVE application profile.';
comment on function private.current_profile_tenant_is_active() is
  'True only when the authenticated profile and its tenant are both ACTIVE.';

commit;
