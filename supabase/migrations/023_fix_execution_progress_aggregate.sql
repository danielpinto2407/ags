begin;

do $$
declare
  v_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.save_routine_execution_performance(uuid,integer,uuid,jsonb,integer,numeric)'::pg_catalog.regprocedure
  ) into v_definition;

  if pg_catalog.strpos(v_definition, 'pg_catalog.coalesce(') > 0 then
    execute pg_catalog.replace(v_definition, 'pg_catalog.coalesce(', 'coalesce(');
  end if;
end;
$$;

commit;
