begin;

alter table public.tenants add column whatsapp_avatar_path text;
alter table public.tenants add constraint tenants_whatsapp_avatar_path_format
  check (whatsapp_avatar_path is null or whatsapp_avatar_path ~ ('^whatsapp-avatars/' || id::text || '/[0-9a-f-]{36}\.png$'));

create policy whatsapp_avatar_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-media'
  and name ~ ('^whatsapp-avatars/' || private.current_profile_tenant_id()::text || '/[0-9a-f-]{36}\.png$')
  and private.current_profile_is_active()
  and private.current_profile_tenant_is_active()
  and private.current_profile_role() = 'coach_admin'
);

create policy whatsapp_avatar_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-media'
  and name ~ ('^whatsapp-avatars/' || private.current_profile_tenant_id()::text || '/[0-9a-f-]{36}\.png$')
  and private.current_profile_is_active()
  and private.current_profile_tenant_is_active()
  and private.current_profile_role() = 'coach_admin'
);

create function public.set_own_tenant_whatsapp_avatar(p_path text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  v_tenant_id uuid := private.current_profile_tenant_id();
begin
  if auth.uid() is null or not private.current_profile_is_active()
    or not private.current_profile_tenant_is_active()
    or private.current_profile_role() <> 'coach_admin' or v_tenant_id is null then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;
  if p_path is not null and (p_path !~ ('^whatsapp-avatars/' || v_tenant_id::text || '/[0-9a-f-]{36}\.png$')
    or not exists (select 1 from storage.objects where bucket_id = 'profile-media' and name = p_path)) then
    raise exception using errcode = '22023', message = 'invalid_avatar_path';
  end if;
  update public.tenants set whatsapp_avatar_path = p_path where id = v_tenant_id;
  return p_path;
end;
$$;

create function public.get_own_tenant_whatsapp_avatar()
returns text language sql stable security definer set search_path = '' as $$
  select tenant.whatsapp_avatar_path from public.tenants tenant
  where tenant.id = private.current_profile_tenant_id()
    and private.current_profile_role() = 'coach_admin'
    and private.current_profile_is_active()
    and private.current_profile_tenant_is_active()
$$;

create function public.get_own_coach_whatsapp_contact()
returns table (coach_name text, whatsapp_number text, avatar_path text)
language sql stable security definer set search_path = '' as $$
  select coach.full_name, coach.whatsapp_number, tenant.whatsapp_avatar_path
  from public.profiles student
  join public.profiles coach on coach.id = student.coach_id and coach.tenant_id = student.tenant_id
    and coach.role = 'coach_admin' and coach.status = 'ACTIVE'
  join public.tenants tenant on tenant.id = student.tenant_id and tenant.status = 'ACTIVE'
  where student.id = auth.uid() and student.role = 'user_personalized' and student.status = 'ACTIVE'
    and coach.whatsapp_number is not null
  limit 1
$$;

revoke all on function public.set_own_tenant_whatsapp_avatar(text), public.get_own_tenant_whatsapp_avatar(), public.get_own_coach_whatsapp_contact() from public, anon;
grant execute on function public.set_own_tenant_whatsapp_avatar(text), public.get_own_tenant_whatsapp_avatar(), public.get_own_coach_whatsapp_contact() to authenticated;

commit;