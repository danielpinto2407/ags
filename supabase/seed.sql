-- Local development tenant only. No auth users, profiles, or credentials are seeded.
-- Idempotent so repeated local resets keep one stable AGS tenant.

insert into public.tenants (
  id,
  name,
  subdomain,
  status,
  theme,
  features,
  max_clients
)
select
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'AGS GluteHouse (Local)',
  'ags',
  'ACTIVE',
  '{
    "logoUrl": null,
    "primaryColor": "#ff0a78",
    "secondaryColor": "#d9005d",
    "backgroundColor": "#050505",
    "accentColor": "#ff70b5"
  }'::jsonb,
  '{
    "personalizedRoutines": true,
    "workoutTimer": true,
    "loadTracking": true,
    "whatsapp": true,
    "groupClasses": false
  }'::jsonb,
  100
where not exists (
  select 1
  from public.tenants
  where subdomain = 'ags'
);

insert into public.tenants (
  id,
  name,
  subdomain,
  status,
  theme,
  features,
  max_clients
)
select
  'a0000000-0000-4000-8000-000000000002'::uuid,
  'Gym Suspendido (Local Test)',
  'pausedgym',
  'SUSPENDED',
  '{
    "logoUrl": null,
    "primaryColor": "#ff0a78",
    "secondaryColor": "#d9005d",
    "backgroundColor": "#050505",
    "accentColor": "#ff70b5"
  }'::jsonb,
  '{
    "personalizedRoutines": true,
    "workoutTimer": true,
    "loadTracking": true,
    "whatsapp": true,
    "groupClasses": false
  }'::jsonb,
  100
where not exists (
  select 1
  from public.tenants
  where subdomain = 'pausedgym'
);
