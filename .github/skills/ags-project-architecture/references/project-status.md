# AGS GluteHouse Project Status

Last reviewed: 2026-11-10

This is the living implementation snapshot. Product invariants and detailed architecture rules remain in the linked skill references; update this file whenever code, schema, tests, configuration, or project documentation changes.

## Current Snapshot

- Branch: `develop`.
- Last committed implementation baseline: `48cb974` (`feat(auth): add CU-01 session, profile access and login flow`).
- Six pre-existing architecture/product-context files are locally modified; this status file, migrations `003`/`004`, and the CU-01B pgTAP test are untracked. None is part of `48cb974` yet.
- Stack: React 18, Vite 5, TypeScript, Tailwind 3, Supabase JS/CLI.
- Local Supabase persists tenant/profile foundation plus CU-01B onboarding. Applied migrations are `001_create_tenants_and_profiles.sql`, `002_enforce_active_profile_and_tenant.sql`, `003_personalized_invitations_and_capacity.sql`, and `004_persistent_personalized_membership.sql`; pgTAP covers tenant/profile RLS, capacity, and invitation acceptance.
- `.env.local` is local-only and ignored. Public signup is disabled. No remote Supabase project has been linked.

## Use-Case Status

| Case | Current status | Remaining work / next dependency |
|---|---|---|
| CU-00 Tenant resolution and theme | Local slice implemented and browser-checked | Production DNS, root-domain/platform host, remote configuration |
| CU-01 Authentication and profile access | Local password sign-in/session/profile slice implemented; smoke and browser login verified | Trusted invitation provisioning, production email/auth setup |
| CU-01B Coach invitation and personalized-user onboarding | Partial: migrations 003/004 applied locally; onboarding, account-linking and acceptance RPCs are pgTAP-covered | Trusted email delivery/Edge Function, invitee completion UI, coach UI, cancellation/failure workflow, and concurrent-request integration test |
| CU-02 Exercise library | UI and fixtures only; not persisted | Tenant-owned schema/RLS/repository/local seed; complete create/edit form and validated video reference |
| CU-02B Routine templates | Planned, optional for first personalized workflow | Defer until direct assignment needs are proven |
| CU-03 Personalized routine assignment/publication | Prototype only | Tenant/student/date assignment model, draft/publish, full exercise snapshot, ownership policies |
| CU-04 Workout execution/check-off | Prototype only | Student sees own published work; persist session, completion, and actual set data |
| CU-04B History/progression | Planned | Derive from persisted workout logs after CU-04 |
| CU-05 Exercise detail/video/timer | Partial UI | Integrate validated video playback and persisted assignment details |
| CU-06 Coach contact | Placeholder | Real contact details/action when product flow is defined |
| CU-07 Tenant administration | Planned | Super-admin operations |
| CU-08 Tenant feature flags | Schema hints exist; enforcement/admin incomplete | Server-side authorization and management |
| CU-09 Tenant suspension/reactivation | RLS blocks suspended tenants; admin workflow not implemented | Trusted lifecycle/admin UI and integration tests |
| CU-10 Group classes | Proposed and deferred | Schedule, capacity (minimum 1), booking, attendance, `user_general` |

## Verified Product And Data Decisions

- The first complete product path is: coach invites by email -> invitee activates account -> coach assigns and publishes a personalized routine -> student signs in and completes it.
- Personalized training precedes group classes. Group-class scheduling, booking, attendance, and per-class capacity are out of scope until the personalized MVP is complete.
- `tenants.max_clients` is the gym-wide member limit, not per-class capacity, and must be >= 1. Migration 003 enforces it. The current capacity RPC counts personalized profiles only; extend it to all active member tracks before group-only accounts are introduced.
- CU-01B email invitations are onboarding to a persistent gym membership, not reservations for classes. Personalized training is programmed by the coach for the user; group-class booking remains deferred.
- Current invitation onboarding supports only the personalized service track. Product decision: one member may have personalized access, group-class access, or both under one Auth identity; when both are active, published personalized programming is primary and group classes are a separate destination.
- Migrations 003/004 do not persist selected service access and acceptance always creates `user_personalized`; do not present group-only or dual invitations as supported yet. Before CU-10, add server-side service entitlements, explicit responsible-coach assignment, and capacity counting by unique member rather than by entitlement. The current capacity function counts personalized profiles only.
- Implemented in migrations 003/004: the tenant row is locked during capacity checks; same-tenant pending invitations are reused; unlinked expired onboarding can release its temporary allocation; Auth-linked pending invitations remain counted after invite-link expiry; acceptance atomically creates the active profile and marks the invitation accepted. The active profile remains counted until the coach-admin inactivates it. Inactive profiles do not consume capacity.
- Public self-signup stays disabled. A browser must never choose its role or `tenant_id`, and service-role credentials must never reach Vite/client code.
- The full Exercise contract is: `id`, `name`, `series`, `reps`, `weight`, optional `workDuration`, `rest`, `emoji`, `muscles`, `instructions`, `tips`, `difficulty`, optional `videoUrl`. Preserve every field through library -> assignment snapshot -> student execution. Keep assignment overrides separate from catalog defaults. Video is optional today; validate its reference and show an explicit no-video state.
- Existing business screens use mocks. `fitnessRepository.getExercises()` returns fixtures; exercise creation only updates screen state. Routine editing uses one global localStorage `RoutineMap`; it is not student-scoped. Student check-offs are in component state and are not persisted.
- Keep an explicit `mock` or `supabase` data mode behind typed repositories. Do not mix sources or silently fall back to mocks on database errors. Mocks remain useful for tests/demo while each vertical slice is moved and verified against local Supabase.
- Local catalog seeds may persist stable-ID demonstration exercises idempotently after schema/RLS is ready. They are demo fixtures, not real user data. Do not seed fake Auth users or personal data in SQL; provision local identities with development-only scripts.
- Existing samples use generic YouTube URLs; do not present them as valid instructional videos. Decide approved external HTTPS URLs versus Supabase Storage when implementing CU-02, then validate/play the chosen format.
- Templates are optional for the first direct student/date assignment. Offline sync is deferred; the first execution flow is online and persists workout/session data.
- Current localhost defaults to tenant `ags`, so it cannot exercise a tenant-less `super_admin` platform context without a separate host setup.

## Immediate Next Work

1. Implement a trusted local invitation endpoint/Edge Function: verify the caller's Auth session and active coach profile, call `prepare_personalized_invitation`, send Supabase Auth invite email, link the returned Auth identity, and handle delivery failures without losing capacity state.
2. Implement invitee completion UI: verify the signed-in invitee identity, collect/validate display name, call `accept_personalized_invitation`, and land in the app with an active persistent profile. Expired links for linked accounts should be resent, not treated as membership removal.
3. Build the coach email form and cancellation/inactivation workflow; add a concurrency integration test for simultaneous attempts at the final membership place and test the complete email flow with Supabase local email catcher.
4. Continue with CU-02 exercise persistence, then CU-03 assignments, CU-04 execution, and CU-04B history. Preserve all exercise/video fields. Do not start CU-10 first.

Open implementation decisions before CU-10: lifecycle for disabling one service versus the whole member account, and the exact `member_service_access` schema/RLS. The product decision is that dual access is allowed and each unique member consumes one `max_clients` place.

## Validation And Local Workflow

- Latest validation: `npx supabase test db` passed 54/54; `npm test` passed 30/30; lint, typecheck, and build passed. Existing warnings: TypeScript version is beyond the current typescript-eslint support range; Vite/esbuild deprecation and Browserslist database warnings remain.
- Database/RLS changes: `npx supabase test db` against the local stack; test both permitted and denied tenant/role/status paths.
- CU-01 auth/session changes: `scripts/smoke-cu01-local.ps1`; browser login accounts use `scripts/dev-test-user.ps1` and must be deleted after checks.
- Local SQL caveat: `supabase db query` runs one statement at a time; use local `psql` for controlled multi-statement scripts. Run Supabase commands from the project directory.
- Do not commit `.env.local`, secrets, `node_modules`, or `dist`.

## Required Status-Update Task

At the end of every implementation or documentation change, update this snapshot in the same work item:

- Mark any touched use case as implemented, partial, blocked, or planned based on verified evidence.
- Record schema, security, seed, test, or configuration changes and validation results.
- Refresh the immediate next step if dependencies or decisions changed.
- Keep the distinction between committed implementation and local uncommitted changes accurate.
- If no project status changed, explicitly state that the status was reviewed and remains accurate; do not add noise-only edits.