begin;

create or replace function public.set_own_coach_whatsapp_number(p_number text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  v_number text := nullif(pg_catalog.btrim(p_number), '');
begin
  if auth.uid() is null or not private.current_profile_is_active()
    or private.current_profile_role() <> 'coach_admin'
    or not private.current_profile_tenant_is_active() then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;
  if v_number is not null and v_number !~ '^573[0-9]{9}$' then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_number';
  end if;
  update public.profiles set whatsapp_number = v_number where id = auth.uid() and role = 'coach_admin';
  return v_number;
end;
$$;

create or replace function public.accept_coach_invitation(p_invitation_id uuid, p_auth_user_id uuid, p_full_name text, p_whatsapp_number text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_number text := pg_catalog.btrim(p_whatsapp_number);
begin
  if v_number is null or v_number !~ '^573[0-9]{9}$' then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_number';
  end if;
  perform public.accept_coach_invitation(p_invitation_id, p_auth_user_id, p_full_name);
  update public.profiles set whatsapp_number = v_number where id = p_auth_user_id;
end;
$$;

commit;