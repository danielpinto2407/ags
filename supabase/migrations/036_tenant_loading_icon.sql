begin;

create policy profile_media_insert_tenant_loading_icon
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-media'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = 'loading-icons'
    and (storage.foldername(name))[2] = (select private.current_profile_tenant_id())::text
    and name ~ '^loading-icons/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and (select private.current_profile_is_active())
    and (select private.current_profile_role()) = 'coach_admin'
    and (select private.current_profile_tenant_is_active())
  );

create policy profile_media_delete_tenant_loading_icon
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-media'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = 'loading-icons'
    and (storage.foldername(name))[2] = (select private.current_profile_tenant_id())::text
    and name ~ '^loading-icons/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and (select private.current_profile_is_active())
    and (select private.current_profile_role()) = 'coach_admin'
    and (select private.current_profile_tenant_is_active())
  );

create function public.set_own_tenant_loading_icon(p_loading_icon_url text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid := private.current_profile_tenant_id();
  v_loading_icon_url text;
begin
  if auth.uid() is null
    or not private.current_profile_is_active()
    or private.current_profile_role() <> 'coach_admin'
    or not private.current_profile_tenant_is_active()
    or v_tenant_id is null
  then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  if p_loading_icon_url is not null and (
    p_loading_icon_url !~ ('^https?://[^/]+/storage/v1/object/public/profile-media/loading-icons/' || v_tenant_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
    or not exists (
      select 1
      from storage.objects
      where bucket_id = 'profile-media'
        and name = regexp_replace(p_loading_icon_url, '^https?://[^/]+/storage/v1/object/public/profile-media/', '')
    )
  ) then
    raise exception using errcode = '22023', message = 'invalid_loading_icon_url';
  end if;

  update public.tenants
  set theme = pg_catalog.jsonb_set(
    theme,
    '{loadingIconUrl}',
    coalesce(pg_catalog.to_jsonb(p_loading_icon_url), 'null'::jsonb),
    true
  )
  where id = v_tenant_id
  returning theme->>'loadingIconUrl' into v_loading_icon_url;

  return v_loading_icon_url;
end;
$$;

revoke all on function public.set_own_tenant_loading_icon(text) from public, anon;
grant execute on function public.set_own_tenant_loading_icon(text) to authenticated;

comment on function public.set_own_tenant_loading_icon(text) is
  'Allows an active coach-admin to set or clear only the loading icon of their active tenant using an existing tenant-scoped profile-media object.';

commit;
