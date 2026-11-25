begin;

drop function if exists private.current_profile_has_feature(text);

create or replace function private.current_profile_has_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.status = 'ACTIVE'
      and (
        (p_capability in ('manage_platform', 'manage_tenants', 'manage_all_profiles') and profile.role = 'super_admin' and profile.tenant_id is null)
        or (p_capability in ('manage_tenant_branding', 'manage_tenant_exercises', 'manage_routines', 'manage_assigned_students') and profile.role = 'coach_admin')
        or (p_capability in ('view_assigned_routines', 'record_own_workouts', 'contact_assigned_coach') and profile.role = 'user_personalized')
      )
  );
$$;

revoke all on function private.current_profile_has_capability(text) from public, anon;
grant execute on function private.current_profile_has_capability(text) to authenticated;

comment on function private.current_profile_has_capability(text) is 'Server-side application capability check derived from the active authenticated profile role and tenant scope.';

commit;
