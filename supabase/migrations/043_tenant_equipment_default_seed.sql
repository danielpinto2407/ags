begin;

create or replace function private.seed_default_tenant_equipment_options()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.tenant_equipment_options (tenant_id, name, position)
  values
    (new.id, 'Mancuernas', 1),
    (new.id, 'Barra', 2),
    (new.id, 'Máquina', 3),
    (new.id, 'Polea', 4),
    (new.id, 'Bandas', 5),
    (new.id, 'Peso corporal', 6),
    (new.id, 'Banco', 7),
    (new.id, 'Kettlebell', 8),
    (new.id, 'Otro', 9)
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function private.seed_default_tenant_equipment_options() from public, anon, authenticated;

drop trigger if exists tenants_seed_default_equipment_options on public.tenants;
create trigger tenants_seed_default_equipment_options
  after insert on public.tenants
  for each row execute function private.seed_default_tenant_equipment_options();

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
on conflict do nothing;

commit;
