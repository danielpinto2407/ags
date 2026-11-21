begin;

drop policy if exists profile_media_insert_tenant_loading_icon on storage.objects;
drop policy if exists profile_media_delete_tenant_loading_icon on storage.objects;
drop function if exists public.set_own_tenant_loading_icon(text);

update public.tenants
set theme = theme - 'loadingIconUrl'
where theme ? 'loadingIconUrl';

commit;
