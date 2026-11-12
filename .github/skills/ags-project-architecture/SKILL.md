---
name: ags-project-architecture
description: "Use whenever changing, planning, reviewing, refactoring, or debugging AGS GluteHouse behavior, screens, data, Supabase/RLS, product requirements, or project architecture, even if the request does not explicitly ask for architecture guidance. Provides the canonical multi-tenant product context, data boundaries, visual system, implementation workflow, and validation rules for this React/Vite application."
---

# AGS GluteHouse Architecture

## Purpose

Use this skill as the canonical project context before changing code. Keep the application easy to extend without coupling screens to storage, SDKs, demo controls, or infrastructure.

## Stack

- React 18, Vite 5, TypeScript strict mode, Tailwind CSS 3.
- Lucide React and ESLint 9 with TypeScript/React Hooks rules.
- Business data is persisted incrementally through feature-owned Supabase repositories: invitations/memberships, exercise library, and date-bound CU-03 assignments are active. CU-03 flexible cycles/executions and CU-04/04B remain planned; student progress currently shows a truthful empty state. Consult `references/project-status.md` for verified deployment state.
- `@supabase/supabase-js` supports local and hosted tenant resolution, password Auth/session/profile validation, invitation onboarding, member status, and the exercise library. Keep secrets server-side and use the status reference for current deployment details.

## Current Structure

```text
src/
├── app/        # AppShell, navigation, screen resolution, tenant bootstrap
├── components/ # Shared presentation and modals
├── data/       # feature repositories, Supabase client, and storage adapters only where required
├── domain/     # Entity contracts and pure validation, including TenantTheme
├── screens/    # Login, coach workflows, student workflows
├── types.ts    # Application types and compatibility exports
├── App.tsx     # High-level composition only
└── main.tsx
```

Target feature areas are introduced incrementally under `src/features/` when a use case requires them. Do not create speculative folders.

## Product Context

AGS GluteHouse is a multi-tenant fitness SaaS. The product specification defines `CU-00` through `CU-10`; roles, tenant boundaries, and current product scope are documented in the references. For current work, use this source-of-truth order:

- Intended behavior, actors, acceptance criteria, and product decisions: [references/product-context.md](references/product-context.md).
- Persisted entities, ownership, validation, and data lifecycle: [references/data-contracts.md](references/data-contracts.md).
- What is actually implemented/deployed and the next milestone: [references/project-status.md](references/project-status.md). Treat deployed/current behavior separately from the target plan.
- Implementation sequence and validation approach: [references/feature-workflow.md](references/feature-workflow.md).
- UI tokens and visual conventions: [references/visual-system.md](references/visual-system.md).
- Final quality gates: [references/quality-checklist.md](references/quality-checklist.md).

If references conflict, do not silently blend them: follow the product decision for intended behavior, the status for verified implementation, and flag the discrepancy for correction. Keep detailed product rules in their owning reference instead of copying them into this summary.

The project-status reference is a living record: review it before planning and update it at closeout for every code, schema, test, configuration, or documentation change. Keep it evidence-based and distinguish committed state from local changes.

## Layer Boundaries

- `src/app/`: composition, shell, navigation, session, tenant bootstrap, and demo-only controls.
- `src/app/tenant/`: pre-login tenant resolution, bootstrap state, and subdomain parsing.
- `src/domain/`: business contracts, validation, and pure calculations, including tenant/theme validation. No React or browser APIs.
- `src/data/`: typed feature repositories/services, isolated Supabase access, and storage adapters only for explicitly offline/local state.
- `src/screens/`: role-level workflow composition.
- `src/components/`: reusable presentation and interaction through props.
- `src/features/`: cohesive feature behavior, hooks, selectors, components, and tests when introduced.

Dependencies flow inward. Screens may use feature hooks and repositories; domain code must not depend on screens, React, or browser APIs. Screens/components must not call Supabase, `fetch`, or `localStorage` directly.

## Essential Rules

1. Keep `App.tsx` small and compositional.
2. Never import `mockData` directly from screens or components.
3. Add domain contracts before fixtures or UI.
4. Expose reads and writes through repository/service boundaries.
5. Keep browser APIs and SDKs behind adapters.
6. Reuse existing components, hooks, types, domain functions, repository methods, and visual tokens before creating new modules.
7. Keep one source of truth for each business concept; do not duplicate calculations, validation, constants, permissions, or styles.
8. Give each module one responsibility and one reason to change.
9. Prefer the simplest functional integration; avoid speculative abstractions, global stores, dependencies, and folders.
10. Use immutable updates, stable IDs, validated external data, and explicit async states.
11. Keep tenant and student scope in data mutations; do not mutate a global routine when a student is selected.
12. Preserve the Spanish UI, `Sora`/`Inter` typography, Tailwind tokens, responsive behavior, and accessible states.
13. Database-driven themes must use a typed validated contract mapped to controlled CSS variables; never inject arbitrary CSS.
14. Client-side guards improve UX only; real authorization and tenant isolation belong server-side/RLS.
15. Do not add controls without behavior, and do not treat localStorage as a database once synchronization is required.

## Feature Workflow

1. Identify the use case, actor, tenant scope, permissions, state transitions, and acceptance behavior.
2. Search existing code and read the relevant references.
3. Add domain contracts and pure logic.
4. Add repository/service operations and validation.
5. Add persistence or synchronization if required.
6. Add feature hooks and compose the screen.
7. Include loading, empty, error, permission, offline, and success states.
8. Reuse the existing visual system and wire navigation last.

## Supabase Direction

Keep Auth calls in `src/data/authRepository.ts` and session lifecycle in `src/app/session/AuthProvider.tsx`. Use only public Vite client configuration, never service-role keys. Resolve tenant before login, load and subscribe to session changes, validate profile/tenant status, preserve silent refresh, and keep session separate from profile role and tenant state. Public signup stays disabled until trusted invitation/provisioning exists.

CU-00 and CU-01 include tenant resolution, typed public RPC validation, theme mapping, persistent session, verified user/profile lookup, signup denial, logout, and active/suspended/not-found/error states. `.env.local` is local-only; `.env.example` documents variables. A development default tenant may be used on localhost. Production root domains must use the neutral platform fallback. Consult `references/project-status.md` for current hosting and deployment facts instead of duplicating them here.

Persisted business data is introduced by vertical slice. A Supabase-backed screen must surface database/permission errors and never silently fall back to mocks. Use fixtures only in tests or an explicitly designed demo flow; do not keep an unused global mock repository. Create test Auth users through local-only scripts, not SQL seeds. Exercise catalog definitions remain separate from CU-03 prescription values, and published/migrated routines must preserve the complete exercise snapshot, including instructional fields and `videoUrl` when supplied.

For CU-01B, invitation UI belongs to the coach workflow, while account creation, email delivery, and tenant/role assignment are handled by trusted server-side code. Personalized invite, acceptance, and reactivation flows do not enforce `tenants.max_clients`; never add capacity logic to them without an explicit product decision. Keep any future CU-10 class capacity separate. Never rewrite applied migration history. Production migration/seed changes require local tests, a remote dry-run, explicit approval, and post-deploy verification; do not run the local `supabase/seed.sql` against Production because it contains development tenants. Production catalog records are introduced through reviewed, idempotent migrations.

## Validation

Run from the directory containing `package.json`:

```powershell
npm run lint
npm run typecheck
npm run build
```

For behavior changes, manually verify role flows, tenant/permission states, navigation return paths, reload persistence, empty/error states, and phone/full preview modes. Apply the complete criteria in [references/quality-checklist.md](references/quality-checklist.md).

## Skill Quality Loop

Keep this skill useful as the project evolves:

1. Update `evals/evals.json` when the skill's scope, workflow, or acceptance rules materially change. Keep prompts representative of real AGS work and expectations objectively checkable where possible.
2. Use `evals/trigger-evals.json` after changing the frontmatter description. Check both should-trigger tasks and near-miss should-not-trigger tasks to avoid broadening activation blindly.
3. For substantive instruction changes, compare a run using the current skill with a baseline using the prior version or no skill. Review outputs against the eval expectations, note regressions and time/effort tradeoffs, then iterate.
4. In VS Code environments without Anthropic's skill-creator runner/viewer, run the prompts manually or with available independent agents and record the limits of the comparison. Do not claim a benchmark was run when only static checks were performed.
5. Keep the main instructions concise, delegate detailed rules to the owning references above, and validate frontmatter, links, eval JSON, and the changed project behavior before closeout.
