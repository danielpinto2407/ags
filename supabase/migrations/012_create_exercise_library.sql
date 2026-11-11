begin;

create type public.exercise_focus as enum (
  'GLUTES',
  'UPPER_BODY',
  'CORE',
  'FULL_BODY'
);

create type public.exercise_equipment as enum (
  'DUMBBELLS',
  'BARBELL',
  'MACHINE',
  'CABLE',
  'BANDS',
  'BODYWEIGHT',
  'BENCH',
  'KETTLEBELL',
  'OTHER'
);

create type public.exercise_movement_pattern as enum (
  'SQUAT',
  'HINGE',
  'HIP_THRUST',
  'LUNGE',
  'ABDUCTION',
  'HORIZONTAL_PUSH',
  'HORIZONTAL_PULL',
  'VERTICAL_PUSH',
  'VERTICAL_PULL',
  'CORE_STABILITY',
  'CARRY',
  'LOCOMOTION',
  'OTHER'
);

create type public.exercise_difficulty as enum (
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED'
);

create table public.exercise_catalog (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  catalog_key text not null unique
    check (catalog_key ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  focus public.exercise_focus not null,
  primary_muscles text[] not null
    check (cardinality(primary_muscles) > 0 and array_position(primary_muscles, '') is null),
  secondary_muscles text[] not null default '{}'
    check (array_position(secondary_muscles, '') is null),
  equipment public.exercise_equipment[] not null
    check (cardinality(equipment) > 0),
  movement_pattern public.exercise_movement_pattern not null,
  difficulty public.exercise_difficulty not null,
  instructions text not null check (length(btrim(instructions)) > 0),
  tips text not null default '',
  video_url text check (video_url is null or video_url ~ '^https://[^[:space:]]+$'),
  archived_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.tenant_exercises (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  source_catalog_exercise_id uuid references public.exercise_catalog (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  focus public.exercise_focus not null,
  primary_muscles text[] not null
    check (cardinality(primary_muscles) > 0 and array_position(primary_muscles, '') is null),
  secondary_muscles text[] not null default '{}'
    check (array_position(secondary_muscles, '') is null),
  equipment public.exercise_equipment[] not null
    check (cardinality(equipment) > 0),
  movement_pattern public.exercise_movement_pattern not null,
  difficulty public.exercise_difficulty not null,
  instructions text not null check (length(btrim(instructions)) > 0),
  tips text not null default '',
  video_url text check (video_url is null or video_url ~ '^https://[^[:space:]]+$'),
  archived_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create index exercise_catalog_active_focus_idx
  on public.exercise_catalog (focus, difficulty)
  where archived_at is null;
create index exercise_catalog_primary_muscles_idx
  on public.exercise_catalog using gin (primary_muscles);
create index exercise_catalog_equipment_idx
  on public.exercise_catalog using gin (equipment);
create index tenant_exercises_tenant_active_focus_idx
  on public.tenant_exercises (tenant_id, focus, difficulty)
  where archived_at is null;
create index tenant_exercises_tenant_primary_muscles_idx
  on public.tenant_exercises using gin (primary_muscles);
create index tenant_exercises_tenant_equipment_idx
  on public.tenant_exercises using gin (equipment);
create index tenant_exercises_source_catalog_idx
  on public.tenant_exercises (source_catalog_exercise_id)
  where source_catalog_exercise_id is not null;

create trigger exercise_catalog_set_updated_at
  before update on public.exercise_catalog
  for each row execute function private.set_updated_at();

create trigger tenant_exercises_set_updated_at
  before update on public.tenant_exercises
  for each row execute function private.set_updated_at();

create function private.guard_tenant_exercise_provenance()
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
  end if;

  if new.source_catalog_exercise_id is not null and not exists (
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

create trigger tenant_exercises_guard_provenance
  before insert or update on public.tenant_exercises
  for each row execute function private.guard_tenant_exercise_provenance();

alter table public.exercise_catalog enable row level security;
alter table public.tenant_exercises enable row level security;

revoke all on table public.exercise_catalog from public, anon, authenticated;
revoke all on table public.tenant_exercises from public, anon, authenticated;
grant select on table public.exercise_catalog to authenticated;
grant select, insert on table public.tenant_exercises to authenticated;
grant update (
  name,
  focus,
  primary_muscles,
  secondary_muscles,
  equipment,
  movement_pattern,
  difficulty,
  instructions,
  tips,
  video_url,
  archived_at
) on table public.tenant_exercises to authenticated;
grant all on table public.exercise_catalog to service_role;
grant all on table public.tenant_exercises to service_role;

create policy exercise_catalog_select_active_users
  on public.exercise_catalog
  for select
  to authenticated
  using (
    archived_at is null
    and (select private.current_profile_is_active())
    and (
      (select private.current_profile_role()) = 'super_admin'
      or (select private.current_profile_tenant_is_active())
    )
  );

create policy tenant_exercises_select_coach_same_tenant
  on public.tenant_exercises
  for select
  to authenticated
  using (
    tenant_id = (select private.current_profile_tenant_id())
    and (select private.current_profile_role()) = 'coach_admin'
    and (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
  );

create policy tenant_exercises_insert_coach_same_tenant
  on public.tenant_exercises
  for insert
  to authenticated
  with check (
    tenant_id = (select private.current_profile_tenant_id())
    and created_by = (select auth.uid())
    and (select private.current_profile_role()) = 'coach_admin'
    and (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
  );

create policy tenant_exercises_update_coach_same_tenant
  on public.tenant_exercises
  for update
  to authenticated
  using (
    tenant_id = (select private.current_profile_tenant_id())
    and (select private.current_profile_role()) = 'coach_admin'
    and (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
  )
  with check (
    tenant_id = (select private.current_profile_tenant_id())
    and (select private.current_profile_role()) = 'coach_admin'
    and (select private.current_profile_is_active())
    and (select private.current_profile_tenant_is_active())
  );

comment on table public.exercise_catalog is
  'Curated immutable cross-tenant exercise definitions; clients can read active records only.';
comment on table public.tenant_exercises is
  'Gym-owned exercise definitions; source catalog copies retain provenance and are independently editable.';
comment on column public.tenant_exercises.source_catalog_exercise_id is
  'Optional immutable provenance for a copied catalog exercise; content is not live-linked.';
comment on column public.tenant_exercises.archived_at is
  'Soft-delete timestamp; archived exercises are excluded from new selection but remain available for references.';

commit;