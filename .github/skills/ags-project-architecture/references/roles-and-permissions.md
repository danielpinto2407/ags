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
- `manage_tenant_branding`
- `manage_tenant_exercises`
- `manage_routines`
- `manage_assigned_students`
- `view_assigned_routines`
- `record_own_workouts`
- `contact_assigned_coach`

Add a capability here and to `ROLE_CAPABILITIES` when a future feature introduces a new independent permission. Do not solve every feature with a role-name switch.

## Tenant feature flags

No workflow implemented today depends on `tenant.features` for authorization. Do not add a feature flag until a concrete implemented workflow requires one. When that happens, require both role capability and tenant feature availability server-side.

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
2. If a future implemented workflow introduces tenant feature availability, add a dedicated validated server helper; do not invent it for speculative features.
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

## Modularity rules for future implementations

- One component owns one responsibility: presentation, orchestration, domain validation or data access. It must not combine unrelated responsibilities.
- A new screen is split only when a responsibility is stable and clearly identifiable. Keep existing state and repositories until extraction tests preserve behavior.
- Extract before a file reaches the repository's practical size threshold or mixes unrelated workflows. Prefer 100–300 lines for UI orchestration and smaller for presentation sections.
- Reuse existing primitives and domain contracts. Do not create a second implementation of a modal, field, button, feedback, loading state or repository method.
- If official behavior is unclear, consult documentation before editing: React/TypeScript for component semantics, Supabase/RLS for server authorization, WCAG/WAI/Material for UX and accessibility, and WhatsApp official guidance for contact links.
- If product behavior, ownership, role scope or user consequence is unclear, ask a concise clarification instead of choosing silently.

## Screen responsibility progress

- `CoachProfile` is split into identity, WhatsApp/avatar and branding sections.
- `CoachProgramRoutine` uses `RoutineProgramConfig` for mode, date and cycle controls.
- `PlatformEquipmentAdmin` uses `PlatformTenantsSection` for tenant form state.
- `StudentTrainingScreen` uses `TrainingSetFields` for exercise series controls.
- `CoachStudentWorkoutHistory` uses `CoachWorkoutHistoryEntrySummary` for list-row presentation and `CoachWorkoutHistoryComments` for comment presentation. Review/detail stays in the owning workflow until an independent review component is justified.
- Never retain the old JSX after moving it to a component. The parent must reference only the new implementation and dead branches must be removed in the same edit.
- Future extraction rule: keep one responsibility per extracted component, pass only data and callbacks, do not move Supabase calls or domain mutations into visual components, and add a static contract test plus focused behavior tests for every split.
- Keep future extraction reversible and behavior-preserving. Do not move a section until its existing handlers, loading/error states and data repository calls remain verified.

## Invitation acceptance pattern

- Never call `auth.updateUser({ password })` from an invitation-acceptance repository or screen before server acceptance succeeds.
- Send identity, password and invitation metadata to a trusted Edge Function.
- The function must verify the authenticated session, invitation identity, tenant, expiry and actor eligibility.
- Password/profile/invitation changes must use an atomic server workflow or compensation: no partial password changes before invitation acceptance is confirmed.
- Add a static or behavioral test that fails if coach acceptance imports `updateUser` or bypasses the trusted function.

## Repository responsibility pattern

- Assignment draft/publication writes belong to a write service.
- Student/coach execution reads and progress belong to execution/history services.
- Workout comments belong to a comment service.
- A repository facade may compose services for compatibility, but must not grow again into a mixed 500-plus-line implementation.
- Screens and hooks depend on a single feature repository/interface. They must not call Supabase or storage directly.
- Future features should add an owner-specific service instead of extending a generic routine/member repository with unrelated concerns.

## Screen responsibility pattern

- Screens should orchestrate state and data hooks, not become catch-all implementations.
- Extract sections that have a stable UI responsibility and real reuse or complexity: identity, settings, palette, roster, editor, review or history.
- Keep domain mutations and SDK calls behind repositories/hooks.
- Preserve the existing public props and handlers during extraction unless tests and callers are updated together.
- Add a static contract test for the split and rerun the full frontend/base validation before moving to another screen.
- Extraction is incomplete while duplicate legacy JSX, unused exports or hidden marker methods remain. Delete them immediately and prove by search/typecheck/tests that there is only one implementation.

## Verification

- Role matrix unit tests.
- Student/coach/super-admin navigation tests.
- Inactive profile and suspended tenant tests.
- Cross-tenant positive and negative reads/writes.
- Feature disabled/enabled tests.
- All mutations remain denied server-side, even if UI controls are hidden.
