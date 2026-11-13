begin;

alter table public.profiles
  add column avatar_path text;

alter table public.profiles
  add constraint profiles_avatar_path_format check (
    avatar_path is null
    or avatar_path ~ ('^avatars/' || id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy profile_media_insert_own_or_tenant_logo
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-media'
    and array_length(storage.foldername(name), 1) = 2
    and (
      (
        (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = (select auth.uid())::text
        and name ~ '^avatars/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
        and (select private.current_profile_is_active())
        and (select private.current_profile_role()) = 'user_personalized'
      )
      or (
        (storage.foldername(name))[1] = 'logos'
        and (storage.foldername(name))[2] = (select private.current_profile_tenant_id())::text
        and name ~ '^logos/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
        and (select private.current_profile_is_active())
        and (select private.current_profile_role()) = 'coach_admin'
        and (select private.current_profile_tenant_is_active())
      )
    )
  );

create policy profile_media_delete_own_or_tenant_logo
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-media'
    and array_length(storage.foldername(name), 1) = 2
    and (
      (
        (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = (select auth.uid())::text
        and (select private.current_profile_is_active())
        and (select private.current_profile_role()) = 'user_personalized'
      )
      or (
        (storage.foldername(name))[1] = 'logos'
        and (storage.foldername(name))[2] = (select private.current_profile_tenant_id())::text
        and (select private.current_profile_is_active())
        and (select private.current_profile_role()) = 'coach_admin'
        and (select private.current_profile_tenant_is_active())
      )
    )
  );

create or replace function public.set_own_profile_avatar(p_avatar_path text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_avatar_path text;
begin
  if v_user_id is null
    or not private.current_profile_is_active()
    or private.current_profile_role() <> 'user_personalized'
  then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  if p_avatar_path !~ ('^avatars/' || v_user_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
    or not exists (
      select 1
      from storage.objects
      where bucket_id = 'profile-media'
        and name = p_avatar_path
    )
  then
    raise exception using errcode = '22023', message = 'invalid_avatar_path';
  end if;

  update public.profiles
  set avatar_path = p_avatar_path
  where id = v_user_id
    and role = 'user_personalized'
  returning avatar_path into v_avatar_path;

  if v_avatar_path is null then
    raise exception using errcode = '42501', message = 'profile_not_found';
  end if;

  return v_avatar_path;
end;
$$;

revoke all on function public.set_own_profile_avatar(text) from public, anon;
grant execute on function public.set_own_profile_avatar(text) to authenticated;

create or replace function public.set_own_tenant_logo(p_logo_url text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant_id uuid := private.current_profile_tenant_id();
  v_previous_logo_url text;
begin
  if v_user_id is null
    or not private.current_profile_is_active()
    or private.current_profile_role() <> 'coach_admin'
    or not private.current_profile_tenant_is_active()
    or v_tenant_id is null
  then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  if p_logo_url !~ ('^https?://[^/]+/storage/v1/object/public/profile-media/logos/' || v_tenant_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
    or not exists (
      select 1
      from storage.objects
      where bucket_id = 'profile-media'
        and name = regexp_replace(p_logo_url, '^https?://[^/]+/storage/v1/object/public/profile-media/', '')
    )
  then
    raise exception using errcode = '22023', message = 'invalid_logo_path';
  end if;

  update public.tenants
  set theme = jsonb_set(
    theme,
    '{logoUrl}',
    to_jsonb(p_logo_url),
    true
  )
  where id = v_tenant_id
  returning theme->>'logoUrl' into v_previous_logo_url;

  return v_previous_logo_url;
end;
$$;

revoke all on function public.set_own_tenant_logo(text) from public, anon;
grant execute on function public.set_own_tenant_logo(text) to authenticated;

drop function public.list_coach_personalized_members();

create function public.list_coach_personalized_members()
returns table (
  member_id uuid,
  full_name text,
  member_status public.profile_status,
  created_at timestamptz,
  email text,
  avatar_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    member.id,
    member.full_name,
    member.status,
    member.created_at,
    auth_user.email,
    member.avatar_path
  from public.profiles as member
  join auth.users as auth_user on auth_user.id = member.id
  join public.profiles as coach
    on coach.id = auth.uid()
   and coach.tenant_id = member.tenant_id
   and coach.role = 'coach_admin'
   and coach.status = 'ACTIVE'
  join public.tenants as tenant
    on tenant.id = coach.tenant_id
   and tenant.status = 'ACTIVE'
  where member.coach_id = coach.id
    and member.role = 'user_personalized'
  order by member.created_at desc;
$$;

revoke all on function public.list_coach_personalized_members() from public, anon;
grant execute on function public.list_coach_personalized_members() to authenticated;

commit;