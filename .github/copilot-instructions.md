# AGS Glutehouse Project Instructions

This is a React 18 + Vite 5 + TypeScript + Tailwind CSS application.

Before changing architecture or adding a feature, read `.github/skills/ags-project-architecture/SKILL.md`.
Read the relevant skill reference when the task touches product cases, data/state, visual design, implementation workflow, or quality review.
Read `.github/skills/ags-project-architecture/references/project-status.md` before planning or implementing work; it is the current implementation snapshot, not a replacement for the detailed references.

## Mandatory rules

- Keep `App.tsx` as a high-level composer. Do not put feature logic, data access, or large screen switches there.
- Keep navigation and shell concerns under `src/app/`; demo-only viewport controls have been removed from the product shell.
- Keep domain contracts under `src/domain/` and data access behind focused, typed repositories/services under `src/data/`; reuse the repository that owns the feature rather than routing unrelated data through a global fitness repository.
- Screens under `src/screens/` compose UI and feature behavior; shared visual pieces belong under `src/components/`.
- Do not import `mockData` directly from screens or components.
- Do not introduce a global state library unless a concrete cross-feature requirement justifies it.
- Keep Supabase integrations behind `src/data/`; local CU-00 resolution and CU-01 password Auth/session/profile validation are implemented. Keep public signup disabled until secured provisioning exists; do not link a remote project without environment/RLS review.
- Put privileged Supabase operations (Auth Admin, server-only keys, invitation provisioning) in `supabase/functions/`; browser code calls them through a repository and never receives service-role credentials.
- Treat the product as a multi-tenant SaaS: tenant scope, actor role, profile status, and feature flags are part of every protected feature.
- Never treat client-side role switching or hidden navigation as authorization; future access control must be enforced server-side with tenant-aware policies.
- RLS must block tenant data for inactive profiles and suspended tenants; self-profile status may remain readable for the blocked message, and active coaches may manage inactive profiles in their own active tenant.
- Map new work to a documented use case (CU-00 through proposed CU-10) and preserve its actor, tenant, state, and acceptance behavior. Current priority is CU-01B email invitations, CU-02 tenant-owned exercises, migrating CU-03 date-bound assignments into the unified `SINGLE_DAY`/`CYCLE` model, then CU-04 student performance logging. `SINGLE_DAY` schedules one routine by calendar date; `CYCLE` defines N ordinal cycle-day routine slots with per-exercise progression. The authored cycle is the first iteration and the coach's count is additional repeats. Defer group-class capacity, scheduling, and booking until this personalized workflow is complete.
- CU-01B invitations must use a coach-facing email form backed by a trusted server-side flow; never expose service-role credentials or let the browser choose invite role/tenant. Personalized invitations, acceptance, and reactivation do not enforce `tenants.max_clients`; there are no class-seat limits in personalized training. Do not add a capacity check unless the product decision changes. Any future CU-10 class capacity is separate.
- A CU-01B invitation joins a person to the gym and grants app access; it is not a class booking. Current implementation is personalized-only. A member may ultimately have both services under one identity: prioritize published coach-assigned programming and keep group classes separate, using server-side entitlements rather than a `both` role or client role switching. Do not expose group-class discovery/booking until CU-10 exists.
- The target CU-03 model has `SINGLE_DAY` and `CYCLE` modes. In cycle mode, routines belong to ordinal plan slots, not calendar dates; the student chooses a slot routine and actual execution date is recorded automatically in UTC. Each slot can be selected out of order and has at most `1 + additionalCycleRepeats` attempts. A closed-incomplete execution consumes that slot's attempt but does not advance its progression; only a completed execution advances per-exercise progression for that slot. A published single-day routine takes precedence on its date. An execution starts only when its first completed set with actual values is saved, not on Play; progress derives from completed sets / prescribed sets. Resume is same-day only and an unfinished execution closes read-only on the next UTC date. Preserve prescriptions, actual load/reps, RIR/RPE, and history as separate concepts; consult the architecture skill references for RLS and schema details.
- Keep exercise definitions (movement, cues, equipment, media) separate from CU-03 prescription values. Published assignments must retain the exact exercise snapshot used; assignment overrides must not mutate catalog defaults.
- For CU-02, preserve the immutable shared catalog versus tenant-owned library boundary, independent copy provenance, coach authorization, and archive semantics. Follow `product-context.md` for product behavior and `data-contracts.md` for schema/RLS details; do not duplicate their full model here. Current coach role is `coach_admin`.
- Each persisted feature uses one explicit repository source. Database errors never silently fall back to mocks; mocks remain only for legacy/demo/test flows. Production catalog records use reviewed idempotent migrations; `supabase/seed.sql` is local-only. Create local Auth users only through development scripts.
- Offline workout behavior requires an explicit sync/conflict strategy; do not silently treat localStorage as a database.
- Apply DRY and reuse: search existing components, hooks, domain functions, repository methods, and types before creating new modules.
- Keep modules decoupled by responsibility: screens do not call SDKs or browser storage directly, and domain code does not depend on React.
- Prefer the simplest functional integration that satisfies the use case; avoid speculative abstractions, global state, and dependencies.
- Keep one source of truth for business data, validation, constants, and derived metrics; do not duplicate logic between screens.
- Give each module one clear responsibility and each async workflow explicit loading, empty, success, and error states.
- Preserve the existing visual system: reuse `Sora`, `Inter`, Tailwind `brand-*` tokens, zinc/status colors, spacing, radii, borders, shadows, and responsive patterns.
- New components must reference existing visual tokens or add named shared tokens; do not scatter arbitrary colors, fonts, shadows, or styles through screens.
- Tenant branding from Supabase must use the typed and validated theme contract mapped to controlled CSS variables; never inject arbitrary CSS or pass raw tenant records into components.
- Preserve the existing Spanish UI and responsive phone/full preview behavior.
- Prefer small, reversible changes. Do not refactor unrelated code.
- Required closeout task: after every code, SQL, test, configuration, or documentation change, review and update `references/project-status.md` in the same work item. Keep case statuses, verified validation, next dependency, and committed/uncommitted state accurate; if there is no status delta, explicitly confirm it remains current without a noise-only edit.
- After edits, run `npm run lint`, `npm run typecheck`, and `npm run build`.
- When changing SQL migrations, grants, RLS, or database functions, also add/update pgTAP tests and run `npx supabase test db` against the local stack.
- When changing CU-01 auth/session/profile behavior, run `scripts/smoke-cu01-local.ps1`; it must use local Supabase only, verify signup stays disabled, and clean up its temporary user/profile.
- For manual browser login checks use `scripts/dev-test-user.ps1 -Action create|delete -Role student|coach` (local Supabase only, throwaway `dev-<role>@example.test` accounts); always delete them afterwards.
- Never commit secrets, `.env` files, `node_modules`, or `dist`.
