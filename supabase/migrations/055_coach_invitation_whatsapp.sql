begin;

create function public.accept_coach_invitation(
  p_invitation_id uuid,
  p_auth_user_id uuid,
  p_full_name text,
  p_whatsapp_number text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number text := pg_catalog.btrim(p_whatsapp_number);
begin
  if v_number is null or v_number !~ '^[1-9][0-9]{7,14}$' then
    raise exception using errcode = '22023', message = 'invalid_whatsapp_number';
  end if;

  perform public.accept_coach_invitation(p_invitation_id, p_auth_user_id, p_full_name);
  update public.profiles set whatsapp_number = v_number where id = p_auth_user_id;
end;
$$;

revoke all on function public.accept_coach_invitation(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.accept_coach_invitation(uuid, uuid, text, text) to service_role;

commit;