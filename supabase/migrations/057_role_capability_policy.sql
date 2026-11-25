begin;

create function private.current_profile_has_capability(p_capability text)
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
        or (p_capability in ('manage_coach_profiles', 'manage_tenant_branding', 'manage_tenant_exercises', 'manage_routines', 'manage_assigned_students') and profile.role = 'coach_admin')
        or (p_capability in ('view_assigned_routines', 'record_own_workouts', 'contact_assigned_coach') and profile.role = 'user_personalized')
        or (p_capability in ('discover_group_classes', 'book_group_classes') and profile.role = 'user_general')
      )
  );
$$;

create function private.current_profile_has_feature(p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    join public.tenants as tenant on tenant.id = profile.tenant_id
    where profile.id = (select auth.uid())
      and profile.status = 'ACTIVE'
      and tenant.status = 'ACTIVE'
      and coalesce((tenant.features ->> p_feature)::boolean, false)
  );
$$;

revoke all on function private.current_profile_has_capability(text), private.current_profile_has_feature(text) from public, anon;
grant execute on function private.current_profile_has_capability(text), private.current_profile_has_feature(text) to authenticated;

comment on function private.current_profile_has_capability(text) is 'Server-side application capability check derived from the active authenticated profile role and tenant scope.';
comment on function private.current_profile_has_feature(text) is 'Server-side tenant feature flag check for authenticated active tenant users.';

commit;
