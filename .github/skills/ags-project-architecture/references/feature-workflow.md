# AGS Feature Workflow

## Before Editing

1. Identify the use case (`CU-00` through `CU-10`) and acceptance behavior. Current product priority is the personalized-training path: CU-01B invitations, CU-02 tenant-owned exercise data, CU-03 per-user routine assignment/publication, then CU-04 execution/check-off. Group classes (proposed CU-10) are deferred.
2. Identify actor, tenant scope, permissions, affected screen, entities, and state transitions.
3. Decide whether data is local, persisted, asynchronous, offline, or server-backed.
4. Search existing components, hooks, domain functions, repository methods, types, and styles before creating anything.
5. State one local hypothesis about the controlling code path and one focused validation check.
6. Read `project-status.md` to understand implemented versus planned behavior before defining scope.

## Implementation Order

1. Add or update domain types and pure functions.
2. Add repository contract and local implementation.
3. Add persistence and payload validation when needed.
4. Add a hook for shared state, subscriptions, or async workflow.
5. Compose the feature screen.
6. Add loading, success, empty, error, offline, and permission states.
7. Wire navigation and feature flags after the feature works independently.
8. Reuse existing components and visual tokens.

When a feature is being migrated from mocks to Supabase, retain an explicit mock adapter and add a Supabase adapter behind the same repository contract. Select exactly one source per run, preserve typed loading/error behavior, and test the use case against local Supabase before removing its mock path. Never hide a Supabase failure by returning mock data.

For CU-02 and CU-03, trace the full exercise contract through library -> published assignment -> student routine/detail. Preserve the video reference and every instructional field; keep assignment prescription overrides separate from catalog defaults and freeze the published content/version.

CU-02 uses two sources: a cross-tenant curated catalog that clients can read but never edit, and a tenant-owned library with CRUD for active authorized coaches. Copying a catalog entry creates an independent tenant-owned snapshot with source provenance; it does not create a live link. Archive instead of hard-delete by default so future assignment/history references remain valid. Current `coach_admin` is the coach UI role; do not invent a separate `coach` database role without defining and testing its permission mapping. Keep enum values stable in storage and Spanish labels in UI. Production catalog records belong in reviewed, idempotent migrations; `supabase/seed.sql` is local-only and must not be applied to Production. CU-02 currently uses Supabase directly; do not add a parallel mock adapter unless an explicit demo mode is requested.

Recommended CU-02 slice order: (1) separate exercise definition from prescription types with an explicit legacy mapper; (2) add global catalog and tenant-owned schema, constraints, grants, archive/provenance, and RLS; (3) add pgTAP allow/deny and cross-tenant copy-isolation tests; (4) add stable seed data; (5) add repository contract and Supabase adapter; (6) implement search/filter and shared/read-only versus gym-owned UI, then create/edit/copy/archive flows; (7) verify coach and member roles, inactive/suspended cases, reload persistence, and phone/full responsive layouts. CU-03 assignment snapshots must retain the chosen definition when the catalog or gym copy changes later.

## Placement

- Domain model: `src/domain/<entity>.ts`.
- Fixtures: `src/data/mockData.ts` or split files under `src/data/mock/` when needed.
- Repository/service: `src/data/`.
- Browser storage: `src/data/storage/`.
- Shared UI: `src/components/`.
- Application shell/navigation/session/tenant bootstrap: `src/app/`.
- Role-specific composition: `src/screens/student/` or `src/screens/coach/`.
- Repeated feature behavior: feature hook, selector, or domain function.
- Feature-specific tests: keep them near the feature when a test setup exists.

## Quality Rules

- Keep one responsibility per module and one source of truth per business concept.
- Keep external SDKs, browser APIs, and storage behind adapters.
- Prefer the smallest functional integration that satisfies the use case.
- Preserve existing public contracts unless a migration is required.
- Avoid global state libraries, routers, abstractions, and dependencies unless a concrete requirement justifies them.
- Never duplicate calculations, validation, role checks, constants, or visual tokens.
- Do not add speculative folders or generic `utils`, `helpers`, or `services` modules.

## Validation

Run from the directory containing `package.json`:

```powershell
npm run lint
npm run typecheck
npm run build
```

For behavior changes, manually verify role flows, navigation return paths, reload persistence, empty/error states, permissions, and phone/full preview modes.

For the personalized MVP, verify the full invite-to-workout path with distinct coach and student accounts. Test email mismatch, duplicate/pending invite behavior, expiry/replay, wrong tenant, draft visibility, and student-only-own-assignment cases. Do not add “capacity full” tests for personalized invitations: the product explicitly does not enforce `tenants.max_clients` in this flow. Group-class booking and per-class capacity validation are out of scope until CU-10.

For Production database changes: finish local migration and pgTAP validation first, inspect `npx supabase db push --dry-run` against the linked project, obtain explicit user approval for the listed remote changes, apply only that set, and verify migration history plus representative data/security invariants afterward. Never run the local `supabase/seed.sql` against Production.

## Required Closeout Task

For every code, schema, test, configuration, or documentation change, review and update `project-status.md` in the same work item. Record only verified state and validation; update the next step when dependencies change. If the work does not change project status, explicitly confirm the snapshot remains current rather than making a noise-only edit.
