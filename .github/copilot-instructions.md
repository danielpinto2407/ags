# AGS Glutehouse Project Instructions

This is a React 18 + Vite 5 + TypeScript + Tailwind CSS application.

Before changing architecture or adding a feature, read `.github/skills/ags-project-architecture/SKILL.md`.
Read the relevant skill reference when the task touches product cases, data/state, visual design, implementation workflow, or quality review.

## Mandatory rules

- Keep `App.tsx` as a high-level composer. Do not put feature logic, data access, or large screen switches there.
- Keep navigation and shell concerns under `src/app/`; demo-only viewport controls have been removed from the product shell.
- Keep domain contracts under `src/domain/` and data access behind `src/data/fitnessRepository.ts`.
- Screens under `src/screens/` compose UI and feature behavior; shared visual pieces belong under `src/components/`.
- Do not import `mockData` directly from screens or components.
- Do not introduce a global state library unless a concrete cross-feature requirement justifies it.
- Keep Supabase integrations behind `src/data/`; local CU-00 resolution and CU-01 password Auth/session/profile validation are implemented. Keep public signup disabled until secured provisioning exists; do not link a remote project without environment/RLS review.
- Treat the product as a multi-tenant SaaS: tenant scope, actor role, profile status, and feature flags are part of every protected feature.
- Never treat client-side role switching or hidden navigation as authorization; future access control must be enforced server-side with tenant-aware policies.
- RLS must block tenant data for inactive profiles and suspended tenants; self-profile status may remain readable for the blocked message, and active coaches may manage inactive profiles in their own active tenant.
- Map new work to a documented use case (CU-00 through CU-09) and preserve its actor, tenant, state, and acceptance behavior.
- Routines must eventually be scoped to tenant, student, and date; progress must preserve target load, actual load, RPE, completion, and history as separate concepts.
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
- After edits, run `npm run lint`, `npm run typecheck`, and `npm run build`.
- When changing SQL migrations, grants, RLS, or database functions, also add/update pgTAP tests and run `npx supabase test db` against the local stack.
- When changing CU-01 auth/session/profile behavior, run `scripts/smoke-cu01-local.ps1`; it must use local Supabase only, verify signup stays disabled, and clean up its temporary user/profile.
- For manual browser login checks use `scripts/dev-test-user.ps1 -Action create|delete -Role student|coach` (local Supabase only, throwaway `dev-<role>@example.test` accounts); always delete them afterwards.
- Never commit secrets, `.env` files, `node_modules`, or `dist`.
