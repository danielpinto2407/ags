create or replace function private.guard_tenant_exercise_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.tenant_id is distinct from old.tenant_id
      or new.source_catalog_exercise_id is distinct from old.source_catalog_exercise_id
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at
    then
      raise exception using errcode = '42501', message = 'exercise_provenance_immutable';
    end if;
  elsif new.source_catalog_exercise_id is not null and not exists (
    select 1
    from public.exercise_catalog as catalog
    where catalog.id = new.source_catalog_exercise_id
      and catalog.archived_at is null
  ) then
    raise exception using errcode = '23503', message = 'exercise_catalog_source_unavailable';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_tenant_exercise_provenance() from public, anon, authenticated;