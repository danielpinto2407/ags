begin;

create table public.tenant_equipment_options (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  position integer not null check (position >= 1),
  archived_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint tenant_equipment_options_name_check
    check (
      pg_catalog.char_length(pg_catalog.btrim(name)) between 1 and 80
      and pg_catalog.btrim(name) = name
    ),
  constraint tenant_equipment_options_id_tenant_unique unique (id, tenant_id),
  constraint tenant_equipment_options_tenant_name_unique unique (tenant_id, name)
);

create unique index tenant_equipment_options_tenant_position_active_unique
  on public.tenant_equipment_options (tenant_id, position)
  where archived_at is null;

create index tenant_equipment_options_tenant_active_idx
  on public.tenant_equipment_options (tenant_id, archived_at, position);

create trigger tenant_equipment_options_set_updated_at
  before update on public.tenant_equipment_options
  for each row execute function private.set_updated_at();

alter table public.tenant_equipment_options enable row level security;
revoke all on table public.tenant_equipment_options from public, anon, authenticated;
grant select, insert, update on table public.tenant_equipment_options to authenticated;

drop policy if exists tenant_equipment_options_super_admin_only
  on public.tenant_equipment_options;
create policy tenant_equipment_options_super_admin_only
  on public.tenant_equipment_options
  for all
  to authenticated
  using (
    (select private.current_profile_is_active())
    and (select private.current_profile_role()) = 'super_admin'
  )
  with check (
    (select private.current_profile_is_active())
    and (select private.current_profile_role()) = 'super_admin'
  );

insert into public.tenant_equipment_options (tenant_id, name, position)
select tenant.id, option.name, option.position
from public.tenants as tenant
cross join (
  values
    ('Mancuernas', 1),
    ('Barra', 2),
    ('Máquina', 3),
    ('Polea', 4),
    ('Bandas', 5),
    ('Peso corporal', 6),
    ('Banco', 7),
    ('Kettlebell', 8),
    ('Otro', 9)
) as option(name, position)
order by tenant.id, option.position
on conflict do nothing;

comment on table public.tenant_equipment_options is
  'Tenant-specific selectable equipment labels managed by platform super-admins.';

commit;
