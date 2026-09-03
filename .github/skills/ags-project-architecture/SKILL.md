---
name: ags-project-architecture
description: "Use when adding, planning, reviewing, refactoring, or debugging functionality in the AGS Glutehouse React/Vite application. Provides the project architecture, folder responsibilities, data boundaries, state rules, maintainability practices, validation workflow, and migration guidance for authentication, persistence, routines, progress, coach features, and student features."
---

# AGS Glutehouse Architecture

## Purpose

Use this skill as the canonical project context before adding functionality. Keep the application easy to extend without moving business logic back into `App.tsx`, coupling screens to storage, or introducing infrastructure before the product contract is clear.

## Current Stack

- React 18 with React DOM.
- Vite 5.
- TypeScript in strict mode.
- Tailwind CSS 3.
- Lucide React for icons.
- ESLint 9 with TypeScript and React Hooks rules.
- `@supabase/supabase-js` is installed but not integrated yet.
- Current persistence is browser `localStorage`; there is no backend or database.

## Product Context From Use Cases

AGS GluteHouse is intended to become a multi-tenant fitness SaaS. The current UI is a local prototype, but new functionality must preserve these product boundaries:

- `tenant`: a gym identified before login by a subdomain and owning users, branding, features, exercises, templates, routines, and limits.
- `super_admin`: platform owner managing gyms, plans, capacity, feature flags, themes, and suspension.
- `coach_admin`: gym administrator managing students, exercises, templates, and personalized routines.
- `user_personalized`: student consuming assigned routines, recording real loads/RPE, completing exercises, and viewing progress.
- `user_general`: future student profile for group classes and gym events.

The use-case specification includes CU-00 through CU-09. It is the source of truth for product behavior; the current mock UI is not proof that a requirement is implemented.

### Use-Case Capability Map

| Capability | Actor | Architectural area | Status |
|---|---|---|---|
| CU-00 tenant detection, theme, suspension | visitor | `app/tenant`, `domain/tenant`, tenant repository | planned |
| CU-01 auth, role redirect, tenant isolation | all users | `features/auth`, `app/session`, Auth adapter | simulated |
| CU-01B student registration and capacity | coach admin | `features/students`, student repository | partial UI |
| CU-02 exercise library | coach admin | `features/exercises`, exercise repository | local UI |
| CU-02B routine templates | coach admin | `features/templates`, template domain | planned |
| CU-03 assign routine by student/day/date | coach admin | `features/routines`, routine repository | partial local UI |
| CU-04 workout, completion, load, RPE, offline | personalized student | `features/workout`, sync queue | partial UI |
| CU-04B load history and PR | student and coach | `features/progress`, progress selectors | planned |
| CU-05 video and audible rest timer | personalized student | workout components and timer service | partial UI |
| CU-06 WhatsApp contact | personalized student | contact service/configuration | placeholder |
| CU-07 gyms, limits, subscriptions | super admin | `features/tenants`, admin routes | planned |
| CU-08 feature flags | super admin | tenant configuration and access policy | planned |
| CU-09 gym suspension | super admin | tenant status, auth guard, blocked state | planned |

### Product Invariants

1. Every tenant-owned record carries or resolves a `tenantId`.
2. A user can only access records belonging to the active tenant and permitted by the server-side role policy.
3. Client-side role switching is demo tooling, never authorization.
4. Routine assignments are scoped to a student and a calendar date or day slot; a global routine map is only fixture data.
5. Capacity limits apply to active student accounts before registration is confirmed.
6. `SUSPENDED` tenants and `INACTIVE` profiles must be blocked even if a cached session exists.
7. Draft routine changes and offline workout events must be distinguishable from published or synchronized data.
8. Target load, actual load, RPE, completion, and historical records are different concepts.
9. Feature flags affect navigation and visibility, but authorization must still be enforced by the backend.

## Current Architecture

```text
src/
├── app/
│   ├── AppShell.tsx             # Application frame and BottomNav
│   ├── DemoControls.tsx         # Role/device controls for prototype mode
│   ├── ScreenRenderer.tsx       # Screen resolution by role and screen
│   └── useAppNavigation.ts      # Role, screen, selected student, viewport state
├── components/                 # Shared presentation components and modals
├── data/
│   ├── mockData.ts              # Local fixtures only
│   ├── fitnessRepository.ts     # Data access boundary and routine persistence
│   └── storage/
│       └── localStorageAdapter.ts
├── domain/
│   ├── achievement.ts
│   ├── coach.ts
│   ├── exercise.ts
│   ├── progress.ts
│   ├── routine.ts               # RoutineMap validation
│   └── student.ts
├── screens/
│   ├── LoginScreen.tsx
│   ├── coach/
│   └── student/
├── types.ts                    # Application types and compatibility exports
├── App.tsx                     # High-level composition only
├── main.tsx                    # React entry point
└── index.css                   # Global Tailwind/base styles
```

## Responsibility Boundaries

### `src/app`

Owns application composition, navigation, shell layout, and prototype-only controls. It may coordinate features, but it must not contain data access, domain calculations, or feature-specific persistence.

### `src/domain`

Owns business contracts and pure domain validation/calculation. Domain modules must not import React, browser APIs, Tailwind classes, or screen components.

### `src/data`

Owns fixtures, repository implementations, and storage adapters. Screens and shared components consume repository APIs, never mock fixtures directly.

### `src/screens`

Owns route-level composition for student and coach workflows. Screens may use hooks and repository APIs, but should delegate reusable business calculations and mutations to domain utilities or feature hooks as complexity grows.

### `src/components`

Owns reusable presentation and interaction pieces. Components should receive data and callbacks through props and should not know where data is stored.

## Target Product Structure

As the use cases are implemented, evolve toward feature-oriented modules while keeping the current `app`, `domain`, and `data` boundaries:

```text
src/
├── app/
│   ├── AppShell.tsx
│   ├── navigation/
│   ├── session/
│   └── tenant/
├── components/
├── domain/
│   ├── achievement.ts
│   ├── exercise.ts
│   ├── progress.ts
│   ├── routine.ts
│   ├── student.ts
│   ├── tenant.ts
│   └── template.ts
├── data/
│   ├── mock/
│   ├── repositories/
│   ├── services/
│   └── storage/
├── features/
│   ├── auth/
│   ├── tenant-theme/
│   ├── students/
│   ├── exercises/
│   ├── templates/
│   ├── routines/
│   ├── workout/
│   ├── progress/
│   └── admin/
├── screens/                  # Keep until each feature screen is migrated
└── types.ts                  # Compatibility exports only
```

Do not create all folders speculatively. Create a feature module when its use case is being implemented, and keep a feature's hooks, selectors, components, and tests together where practical.

## Non-Negotiable Practices

1. Keep `App.tsx` small and compositional.
2. Do not import `mockData.ts` from screens or components.
3. Add new entities to `src/domain` before adding them to fixtures.
4. Expose reads and writes through a repository or service boundary.
5. Keep browser APIs behind adapters such as `localStorageAdapter`.
6. Prefer immutable updates and return copies from repository reads.
7. Validate persisted or external data before using it.
8. Derive displayed metrics from one source of truth; do not duplicate hardcoded totals across screens.
9. Use stable entity IDs. Do not rely on `Date.now()` as a production identifier once data is shared or synchronized.
10. Do not add Redux, Zustand, React Router, or another framework solely for convention. Introduce them only when a concrete requirement justifies the dependency.
11. Keep visible UI text in Spanish and preserve responsive behavior unless the feature explicitly changes product requirements.
12. Do not create visual controls without behavior. Disable, hide, or implement them.
13. Never add secrets, credentials, `.env` files, `node_modules`, or `dist` to version control.

## Adding a Feature Workflow

### 1. Define the contract

Before editing, identify:

- User role: student, coach, or both.
- Screen/workflow affected.
- Domain entities and state transitions.
- Read and write operations required.
- Empty, loading, error, and permission states.
- Whether the state must survive navigation or reload.

### 2. Place the code

- New domain model: `src/domain/<entity>.ts`.
- New fixture: `src/data/mockData.ts` or split fixture modules under `src/data/mock/` when the file becomes difficult to navigate.
- New persistence/read/write operation: `src/data/fitnessRepository.ts` or a dedicated repository module.
- Browser persistence detail: `src/data/storage/`.
- Reusable UI: `src/components/`.
- Role-specific composition: `src/screens/student/` or `src/screens/coach/`.
- Repeated feature behavior: add a feature hook or pure utility rather than duplicating it in multiple screens.

### 3. Implement from the boundary inward

1. Add or update domain types and pure functions.
2. Add repository contract and local implementation.
3. Add persistence and validation if required.
4. Add a hook for subscriptions or mutations if state crosses screens.
5. Compose the screen.
6. Add empty/error/loading states.
7. Wire navigation only after the feature screen works independently.

### 4. Validate

Run from the directory containing `package.json`:

```powershell
npm run lint
npm run typecheck
npm run build
```

For behavior changes, manually verify:

- Student and coach role flows.
- Switching screens and returning to the feature.
- Browser reload when persistence is involved.
- Empty collections and invalid stored data.
- Phone and full preview modes.

## Data and State Rules

### Routines

The canonical shape is:

```ts
type RoutineMap = Record<Day, Exercise[]>;
```

The product-ready shape is per tenant, student, and schedule:

```ts
type StudentRoutineMap = Record<TenantId, Record<StudentId, RoutineMap>>;
```

For real scheduling, prefer explicit assignment records with a date, publication state, and audit fields over an unbounded nested object. Do not keep a selected student only as UI state while mutating a global routine map. The selected student and tenant must identify the data being read and written.

### Templates and Assignments

Templates are reusable definitions. Assignments are student-specific copies or references with per-exercise overrides. Editing a template must not silently rewrite an already published student routine.

Recommended conceptual entities:

```text
Tenant
Profile/User
Exercise
RoutineTemplate
RoutineTemplateItem
RoutineAssignment
RoutineAssignmentItem
WorkoutSession
SetLog
ProgressRecord
FeatureFlags
```

### Tenant and Theme

Tenant detection happens before authentication. Keep subdomain parsing, tenant lookup, theme loading, and suspended-state handling in a dedicated tenant feature. Theme JSON must be validated and applied through a controlled CSS variable mapping; never inject arbitrary CSS from remote data.

### Offline Workout

Offline support is a synchronization problem, not just a `localStorage` write. Keep local drafts/events separate from server records, add event IDs and timestamps, define retry/conflict behavior, and expose sync status to the user. Prefer IndexedDB when workout logs become non-trivial; retain `localStorage` only for small preferences or drafts.

### Progress

Do not maintain independent hardcoded progress in `StudentHome`, `StudentRoutines`, and `StudentProgress`. Store completion events or a repository-owned progress model, then derive daily, weekly, and streak metrics through pure selectors.

### Repository

`fitnessRepository` is currently a local repository. It owns routine snapshots, local persistence, validation, and subscriptions. If the storage mechanism changes, preserve the screen-facing API where possible.

The current repository uses the `ags-glutehouse-routines` localStorage key. Changes to its serialized shape require a version or migration strategy.

When repositories become asynchronous, expose loading and error results through feature hooks. Screens must not import the Supabase client directly. Keep repository contracts independent from Supabase so local fixtures remain usable in tests.

## Known Technical Gaps

These are intentional follow-up tasks, not reasons to rewrite the current structure:

- Associate routines with each student.
- Persist the exercise library through the repository.
- Define a single progress/completion model.
- Decide whether routine saving is explicit or automatic; match button labels to that choice.
- Add authentication and authorization before treating role controls as real security.
- Add tests for domain validation, repository persistence, routine mutations, and navigation.
- Add real loading/error states when asynchronous data sources are introduced.
- Remove or isolate `DemoControls` when the real login flow replaces demo role switching.
- Add React Router only when URL navigation, browser back/forward, or deep linking is required.

## Authentication Guidance

When Supabase Auth is introduced:

- Keep the Supabase client in a dedicated data/infrastructure module.
- Read only public client configuration from Vite environment variables.
- Never expose service-role keys in the browser.
- Model session state separately from UI role state.
- Treat authorization as a backend policy, not as a hidden screen or demo button.
- Add loading, signed-out, signed-in, and auth-error states.
- Replace `handleLogin` with a real service call without making screens import Supabase directly.

Authentication implementation must follow the use cases:

- Resolve the tenant from the hostname before showing login.
- Support `super_admin`, `coach_admin`, `user_personalized`, and future `user_general` roles.
- Load the Supabase session on startup and subscribe to auth changes.
- Keep session state separate from profile role and tenant state.
- Check profile status and tenant status after authentication.
- Do not trust a client-provided tenant ID, role, or feature flag.
- Configure RLS by tenant and role in the database; frontend guards are only UX.
- Handle silent refresh, sign-out, expired sessions, inactive profiles, and suspended tenants.

## Code Quality and Integration Principles

Apply these principles to every implementation:

### Decoupling

- Depend on interfaces, domain types, callbacks, and repository contracts rather than concrete storage or UI implementations.
- Keep dependencies flowing inward: screens may use feature hooks and repositories; domain code must not depend on React, browser APIs, or screens.
- Keep external integrations behind a small adapter or service. A screen must not call Supabase, `fetch`, `localStorage`, or third-party SDKs directly.
- Pass only the data and actions a component needs. Avoid passing entire application state objects when focused props are enough.
- Do not couple a feature to demo controls, mock fixture names, or a specific persistence mechanism.

### DRY and Reuse

- Search existing components, hooks, utilities, repository methods, and types before creating new ones.
- Reuse an existing module when behavior and responsibility match; extend it with a focused API when necessary.
- Extract duplicated business logic into a pure domain function or feature hook, not into a generic utility with unclear responsibility.
- Keep one source of truth for entities, configuration, derived metrics, and persistence.
- Do not duplicate constants, validation rules, formatting rules, or role checks across screens.
- Do not create abstractions for one use case unless they remove meaningful complexity or establish a required boundary.

### Simplicity and Scope

- Choose the simplest integration that satisfies the use case and preserves a future replacement path.
- Prefer a small explicit function over a framework, global store, or generic abstraction introduced only for convention.
- Implement the requested behavior end to end before adding optional infrastructure.
- Keep each change focused on one capability and avoid opportunistic refactors.
- Preserve existing public contracts when possible; introduce migrations only when a contract must change.
- Use YAGNI: do not implement speculative settings, APIs, feature flags, or abstractions before a use case requires them.

### Responsibility and Maintainability

- Each module should have one clear reason to change.
- Keep presentation, domain decisions, data access, persistence, and integration concerns separate.
- Prefer pure functions for calculations and validation so they can be tested without rendering the app.
- Make state ownership explicit: local UI state for ephemeral interaction, repository or feature state for shared/persistent business data.
- Give every asynchronous workflow explicit loading, success, empty, and error states.
- Name modules after their business responsibility, not after implementation details such as `helpers` or `misc`.

## Review Checklist

Before considering a feature complete, confirm:

- Is the domain model explicit and typed?
- Is data access behind a repository/service?
- Is state ownership clear and persistent when required?
- Are mutations immutable and scoped to the correct student/day/entity?
- Are empty, error, loading, and permission states handled?
- Are visible controls connected to real behavior?
- Is duplicated business logic avoided?
- Were existing modules searched and reused before creating new abstractions?
- Does each new module have one clear responsibility and one reason to change?
- Are integration details isolated behind a small adapter or service?
- Is the chosen solution the simplest one that satisfies the use case?
- Are speculative abstractions, dependencies, and configuration avoided?
- Are demo-only controls kept separate from product behavior?
- Does the feature preserve the existing Spanish UI and responsive layout?
- Do lint, typecheck, and build pass?

For use-case work, also confirm:

- Which CU and acceptance behavior does the change implement?
- Is the actor and tenant scope explicit?
- Is the capability gated by authentication, role, tenant status, and feature flags as applicable?
- Are draft, published, offline, failed, and synchronized states distinguishable?
- Does the data model preserve history instead of overwriting a prior workout record?
- Can the local implementation later be replaced by Supabase without changing screen contracts?

## Anti-Patterns

Avoid:

- Adding more conditionals and screen imports to `App.tsx` for every feature.
- Importing `MOCK_*` directly into screens.
- Calling `window.localStorage` from a component.
- Storing a global routine when a student selector is present.
- Hardcoding metrics that should be derived from persisted state.
- Adding a global state library before defining state ownership.
- Treating client-side role switching as authentication.
- Adding a button for a future feature without a disabled state or clear placeholder behavior.
- Refactoring every existing screen before the next feature has a real requirement.
- Creating a second component, hook, repository method, or constant when an existing module already owns that responsibility.
- Copying and modifying the same calculation or validation in multiple screens.
- Creating a generic `utils`, `services`, or `helpers` module without a cohesive responsibility.
- Passing concrete SDK clients, storage objects, or broad application state through presentation components.
- Introducing a global store, event bus, or framework integration to solve a local state problem.
- Building an elaborate abstraction before implementing and understanding the first real use case.
