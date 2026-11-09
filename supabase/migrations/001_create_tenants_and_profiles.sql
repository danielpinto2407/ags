-- AGS GluteHouse: tenant and profile foundation (CU-00 / CU-01)
-- Apply with Supabase CLI migrations or the Supabase SQL editor.
-- No demo tenant or auth user is inserted by this migration.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create type public.tenant_status as enum (
	'ACTIVE',
	'SUSPENDED'
);

create type public.profile_status as enum (
	'ACTIVE',
	'INACTIVE'
);

create type public.app_role as enum (
	'super_admin',
	'coach_admin',
	'user_personalized',
	'user_general'
);

create table public.tenants (
	id uuid primary key default pg_catalog.gen_random_uuid(),
	name text not null check (length(btrim(name)) > 0),
	subdomain text not null,
	status public.tenant_status not null default 'ACTIVE',
	theme jsonb not null default '{
		"logoUrl": null,
		"primaryColor": "#ff0a78",
		"secondaryColor": "#d9005d",
		"backgroundColor": "#050505",
		"accentColor": "#ff70b5"
	}'::jsonb,
	features jsonb not null default '{
		"personalizedRoutines": true,
		"workoutTimer": true,
		"loadTracking": true,
		"whatsapp": true,
		"groupClasses": false
	}'::jsonb,
	max_clients integer not null default 0 check (max_clients >= 0),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint tenants_subdomain_format check (
		subdomain = lower(subdomain)
		and subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
	),
	constraint tenants_theme_is_object check (jsonb_typeof(theme) = 'object'),
	constraint tenants_features_is_object check (jsonb_typeof(features) = 'object')
);

create unique index tenants_subdomain_lower_unique_idx
	on public.tenants (lower(subdomain));

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	tenant_id uuid references public.tenants (id) on delete restrict,
	role public.app_role not null,
	status public.profile_status not null default 'ACTIVE',
	full_name text not null check (length(btrim(full_name)) > 0),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint profiles_super_admin_tenant_scope check (
		(role = 'super_admin' and tenant_id is null)
		or (role <> 'super_admin' and tenant_id is not null)
	)
);

create index profiles_tenant_id_idx on public.profiles (tenant_id);
create index profiles_tenant_status_idx on public.profiles (tenant_id, status);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at := pg_catalog.now();
	return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger tenants_set_updated_at
	before update on public.tenants
	for each row execute function private.set_updated_at();

create trigger profiles_set_updated_at
	before update on public.profiles
	for each row execute function private.set_updated_at();

-- RLS helpers are kept outside exposed schemas and use a pinned empty search_path.
-- SECURITY DEFINER prevents recursive profile policies; each function returns
-- only the caller's own authorization attributes.
create function private.current_profile_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
	select p.tenant_id
	from public.profiles as p
	where p.id = (select auth.uid())
	limit 1;
$$;

create function private.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
	select p.role
	from public.profiles as p
	where p.id = (select auth.uid())
	limit 1;
$$;

revoke all on function private.current_profile_tenant_id() from public, anon;
revoke all on function private.current_profile_role() from public, anon;
grant execute on function private.current_profile_tenant_id() to authenticated;
grant execute on function private.current_profile_role() to authenticated;

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;

-- Revoke default client grants explicitly; RLS policies do not replace grants.
revoke all on table public.tenants from public, anon, authenticated;
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.tenants to authenticated;
grant select on table public.profiles to authenticated;
grant all on table public.tenants to service_role;
grant all on table public.profiles to service_role;

create policy tenants_select_same_tenant_or_super_admin
	on public.tenants
	for select
	to authenticated
	using (
		id = (select private.current_profile_tenant_id())
		or (select private.current_profile_role()) = 'super_admin'
	);

create policy profiles_select_self_coach_tenant_or_super_admin
	on public.profiles
	for select
	to authenticated
	using (
		id = (select auth.uid())
		or (
			tenant_id = (select private.current_profile_tenant_id())
			and (select private.current_profile_role()) = 'coach_admin'
		)
		or (select private.current_profile_role()) = 'super_admin'
	);

-- CU-00 public resolver. It exposes only fields required before login.
-- Feature flags are presentation hints, never authorization decisions.
create function public.resolve_tenant_by_subdomain(p_subdomain text)
returns table (
	tenant_id uuid,
	tenant_name text,
	tenant_subdomain text,
	tenant_status public.tenant_status,
	theme jsonb,
	features jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
	select t.id, t.name, t.subdomain, t.status, t.theme, t.features
	from public.tenants as t
	where p_subdomain is not null
		and lower(btrim(p_subdomain)) ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
		and t.subdomain = lower(btrim(p_subdomain))
	limit 1;
$$;

revoke all on function public.resolve_tenant_by_subdomain(text) from public;
grant execute on function public.resolve_tenant_by_subdomain(text) to anon, authenticated;

comment on table public.tenants is
	'Gym/organization boundary. Public access is limited to resolve_tenant_by_subdomain().';
comment on column public.tenants.theme is
	'Validated theme configuration. Frontend must map allowlisted values to controlled CSS variables; never inject arbitrary CSS.';
comment on column public.tenants.features is
	'Tenant feature visibility hints. These flags do not replace server-side authorization.';
comment on table public.profiles is
	'Application profile linked one-to-one with auth.users; role and tenant membership are provisioned by trusted server-side code.';
comment on function public.resolve_tenant_by_subdomain(text) is
	'Returns allowlisted public tenant metadata needed to render pre-login tenant branding.';

commit;
