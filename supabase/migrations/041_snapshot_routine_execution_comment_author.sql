begin;

alter table public.routine_execution_comments
  add column author_name text;

create or replace function private.set_routine_execution_comment_author_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_name text;
begin
  select pg_catalog.btrim(profile.full_name)
  into v_author_name
  from public.profiles as profile
  where profile.id = new.author_id
    and profile.tenant_id = new.tenant_id;

  new.author_name := case
    when v_author_name is not null and pg_catalog.char_length(v_author_name) between 1 and 120 then v_author_name
    else 'Usuario'
  end;
  return new;
end;
$$;

revoke all on function private.set_routine_execution_comment_author_name() from public, anon, authenticated;

drop trigger if exists routine_execution_comments_set_author_name on public.routine_execution_comments;
create trigger routine_execution_comments_set_author_name
  before insert on public.routine_execution_comments
  for each row execute function private.set_routine_execution_comment_author_name();

update public.routine_execution_comments as comment
set author_name = case
  when pg_catalog.btrim(profile.full_name) <> ''
    and pg_catalog.char_length(pg_catalog.btrim(profile.full_name)) between 1 and 120
    then pg_catalog.btrim(profile.full_name)
  else 'Usuario'
end
from public.profiles as profile
where profile.id = comment.author_id
  and profile.tenant_id = comment.tenant_id;

update public.routine_execution_comments
set author_name = 'Usuario'
where author_name is null;

alter table public.routine_execution_comments
  alter column author_name set not null,
  add constraint routine_execution_comments_author_name_check
    check (pg_catalog.char_length(author_name) between 1 and 120);

commit;
