begin;

do $$
declare
  v_definition text;
  v_marker text := '      if v_completed then v_has_completed_set := true; end if;';
  v_guard text := E'      if v_completed and (v_item.base_load is not null or length(btrim(v_item.target_load)) > 0)\n        and v_actual_load is null\n      then\n        raise exception using errcode = ''22023'', message = ''completed_weighted_set_requires_load'';\n      end if;\n';
begin
  select pg_catalog.pg_get_functiondef(
    'public.save_routine_execution_performance_integer(uuid,integer,uuid,jsonb,integer,numeric)'::pg_catalog.regprocedure
  ) into v_definition;

  if pg_catalog.strpos(v_definition, 'completed_weighted_set_requires_load') = 0 then
    v_definition := pg_catalog.replace(v_definition, v_marker, v_guard || v_marker);
    execute v_definition;
  end if;
end;
$$;

commit;
