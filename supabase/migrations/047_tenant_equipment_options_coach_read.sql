begin;

drop policy if exists tenant_equipment_options_select_participant on public.tenant_equipment_options;
create policy tenant_equipment_options_select_participant
  on public.tenant_equipment_options
  for select
  to authenticated
  using (
    (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
    and (
      ((select private.current_profile_role()) = 'super_admin')
      or (
        (select private.current_profile_role()) = 'coach_admin'
        and tenant_id = (select private.current_profile_tenant_id())
      )
    )
  );

commit;
