# AGS Glutehouse Project Instructions

This is a React 18 + Vite 5 + TypeScript + Tailwind CSS application.

Before changing architecture or adding a feature, read `.github/skills/ags-project-architecture/SKILL.md`.

## Mandatory rules

- Keep `App.tsx` as a high-level composer. Do not put feature logic, data access, or large screen switches there.
- Keep navigation and shell concerns under `src/app/`.
- Keep domain contracts under `src/domain/` and data access behind `src/data/fitnessRepository.ts`.
- Screens under `src/screens/` compose UI and feature behavior; shared visual pieces belong under `src/components/`.
- Do not import `mockData` directly from screens or components.
- Do not introduce a global state library unless a concrete cross-feature requirement justifies it.
- Do not connect Supabase or add authentication placeholders without a defined contract, session flow, and environment-variable strategy.
- Treat the product as a multi-tenant SaaS: tenant scope, actor role, profile status, and feature flags are part of every protected feature.
- Never treat client-side role switching or hidden navigation as authorization; future access control must be enforced server-side with tenant-aware policies.
- Map new work to a documented use case (CU-00 through CU-09) and preserve its actor, tenant, state, and acceptance behavior.
- Routines must eventually be scoped to tenant, student, and date; progress must preserve target load, actual load, RPE, completion, and history as separate concepts.
- Offline workout behavior requires an explicit sync/conflict strategy; do not silently treat localStorage as a database.
- Apply DRY and reuse: search existing components, hooks, domain functions, repository methods, and types before creating new modules.
- Keep modules decoupled by responsibility: screens do not call SDKs or browser storage directly, and domain code does not depend on React.
- Prefer the simplest functional integration that satisfies the use case; avoid speculative abstractions, global state, and dependencies.
- Keep one source of truth for business data, validation, constants, and derived metrics; do not duplicate logic between screens.
- Give each module one clear responsibility and each async workflow explicit loading, empty, success, and error states.
- Preserve the existing Spanish UI and responsive phone/full preview behavior.
- Prefer small, reversible changes. Do not refactor unrelated code.
- After edits, run `npm run lint`, `npm run typecheck`, and `npm run build`.
- Never commit secrets, `.env` files, `node_modules`, or `dist`.
