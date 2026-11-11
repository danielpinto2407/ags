-- CU-01B: coaches may only read personalized members they invited.
-- Members retain self-read and platform super_admin retains cross-tenant access.

begin;

drop policy profiles_select_self_or_active_authorized_tenant on public.profiles;

create policy profiles_select_self_invited_members_or_super_admin
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
          and role = 'user_personalized'
          and tenant_id = (select private.current_profile_tenant_id())
          and coach_id = (select auth.uid())
        )
      )
    )
  );

comment on policy profiles_select_self_invited_members_or_super_admin on public.profiles is
  'Authenticated users can read their own profile; active coaches can read only their same-tenant personalized invitees; super_admin can read all profiles.';

commit;
