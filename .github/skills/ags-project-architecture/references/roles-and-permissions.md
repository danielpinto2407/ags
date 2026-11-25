# Roles, Capabilities and Permissions

## Source of truth

- Database: `public.app_role` is the persisted identity role.
- UI: `src/domain/authorization.ts` maps roles to product roles, capabilities and allowed screens.
- Session: `resolveProfileAccess` validates status, tenant scope and persisted role before authentication becomes usable.
- Server: RLS and trusted RPCs are authoritative. Hiding a control or route in React is not authorization.
- Tenant: `tenant.features` controls optional tenant availability. It is not a substitute for role authorization.

## Current roles

- `super_admin`: platform-wide tenant and profile administration. It cannot belong to a tenant.
- `coach_admin`: tenant-scoped coaching, member management, branding, catalog and routine operations.
- `user_personalized`: tenant-scoped student with assigned routines and workout logging.
- `user_general`: future tenant-scoped group-class member. It remains blocked until CU-10 behavior is implemented.
- `INACTIVE`: profile status, not a role. It blocks every capability before role checks.

## Capabilities

Use capabilities instead of checking persisted role names in feature UI:

- `manage_platform`
- `manage_tenants`
- `manage_all_profiles`
- `manage_coach_profiles`
- `manage_tenant_branding`
- `manage_tenant_exercises`
- `manage_routines`
- `manage_assigned_students`
- `view_assigned_routines`
- `record_own_workouts`
- `contact_assigned_coach`
- `discover_group_classes`
- `book_group_classes`

Add a capability here and to `ROLE_CAPABILITIES` when a future feature introduces a new independent permission. Do not solve every feature with a role-name switch.

## Tenant feature flags

Use named flags in `tenant.features` only for availability independent from role:

- `personalizedRoutines`
- `groupClasses`
- `whatsappContact`
- `coachBiometrics`
- `workoutComments`

A feature requires both dimensions:

```text
active profile + matching tenant + role capability + tenant feature flag
```

No feature flag should allow a forbidden role to perform a protected mutation.

## Navigation

- `getRoleScreens` defines the product screens available to student or coach UI roles.
- `canRoleOpenScreen` must guard navigation handlers before adding new screens.
- `ScreenRenderer` and `BottomNav` consume the same role model; do not add a screen switch that bypasses the role policy.
- `super_admin` uses the platform shell and must never inherit student or coach navigation.

## Server enforcement

For database work:

1. Use `private.current_profile_has_capability(...)` for a single role-derived server capability.
2. Use `private.current_profile_has_feature(...)` for tenant feature availability.
3. Preserve tenant ownership checks and profile status checks in RPCs/RLS.
4. Do not add an RPC or policy that trusts a browser-supplied role or tenant ID.
5. A future table or function must pass the same actor, tenant, status and ownership test used by existing CU-02/CU-03 data.

## Adding a role or capability

1. Add the role/capability to `src/domain/authorization.ts`.
2. Extend `resolveProfileAccess` and profile payload validation only if it changes session behavior.
3. Add the role to `public.app_role` through a migration when it must be persisted.
4. Add capability mapping to `private.current_profile_has_capability`.
5. Add navigation screens and feature flags explicitly.
6. Add domain tests, pgTAP tests, browser role tests and RLS cross-tenant tests.
7. Document the actor and use case in `product-context.md`.

## Verification

- Role matrix unit tests.
- Student/coach/super-admin navigation tests.
- Inactive profile and suspended tenant tests.
- Cross-tenant positive and negative reads/writes.
- Feature disabled/enabled tests.
- All mutations remain denied server-side, even if UI controls are hidden.
