begin;

alter table public.exercise_catalog
  alter column equipment type text[]
  using equipment::text[];

alter table public.tenant_exercises
  alter column equipment type text[]
  using equipment::text[];

commit;
