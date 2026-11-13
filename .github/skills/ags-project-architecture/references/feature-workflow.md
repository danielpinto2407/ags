# AGS Feature Workflow

## Before Editing

1. Identify the use case (`CU-00` through `CU-10`) and acceptance behavior. Current product priority is the personalized-training path: CU-01B invitations, CU-02 tenant-owned exercise data, the CU-03 cycle/progression extension, CU-04 actual workout recording, then CU-04B biometrics and progress. Group classes (proposed CU-10) are deferred.
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

For the newly requested CU-03/04/04B scope, implement in this order: (1) migrate CU-03 to one unified `SINGLE_DAY`/`CYCLE` model. A selected `SINGLE_DAY` routine takes precedence for that date. `CYCLE` contains N ordinal slots with one routine and per-exercise integer progression per slot; each slot has at most `1 + additionalCycleRepeats` attempts and can be selected out of order. An incomplete close consumes that slot's attempt but does not advance progression; only a completed execution increments the slot's progression count. (2) Persist executions only when the first completed set with actual values is saved; Play alone does not consume the daily start. Enforce one started execution per student/local date across both modes, same-day resume only, and immutable end-of-day closure. Derive progress from completed sets over prescribed sets. (3) Persist CU-04 actual reps/load and completion per set, plus RIR/RPE per exercise, separately from targets; use separate slider-style bars with visible bounds/current values. (4) Define the pending biometric form, metric catalogue/units, and coach-write/student-own-read permissions. (5) Add pgTAP/RLS and domain tests for migration fidelity, both programming modes, single-day precedence, concurrent daily-start enforcement, closure, slot attempts/progression, set-derived progress, and valid metric boundaries before screen work. (6) Surface unified coach programming, student routine choice/execution, actual-performance logging, then biometric/profile history. Keep prescriptions, execution data, and biometrics in separate records.

### CU-03 Implementation Tasks

Execute this work incrementally as a migration from the deployed date-bound schema to one unified programming model:

1. **Baseline and migration inventory.** Capture regression tests for existing data/security invariants, then inventory draft/published assignments, ordered items, exercise snapshots, ownership, and dates. Define an idempotent backfill mapping each historical assignment to `SINGLE_DAY` mode without losing prescriptions or history. Treat the current UI behavior as migration input, not a parallel feature to preserve.
2. **Add the pure plan model.** Represent the discriminated modes `SINGLE_DAY` and `CYCLE`. Single-day mode has one scheduled date and one routine. Cycle mode has N ordered cycle-day slots, each with a routine and per-exercise integer rep/load increments plus `lbs` or `kg`. Store additional cycle repeats separately; total iterations equal one authored iteration plus the additional count. Test mode validation, N slot coverage, independent progression by slot/exercise, integer arithmetic, unit preservation, deterministic repeat targets, and historical mapping.
3. **Apply the confirmed cycle advancement rule.** Each slot has its own attempt number and may be selected out of order, up to `1 + additionalCycleRepeats`. A `CLOSED_INCOMPLETE` execution consumes its attempt; only `COMPLETED` executions advance that slot's progression count. A subsequent attempt after an incomplete close keeps the same target.
4. **Model student executions and progress.** Create an execution only when the first completed set with valid actual reps/load is saved; pressing Play without a saved set does not consume the day. Enforce at most one started execution per student/local date across modes; resume only on its start date. At day end, close incomplete execution as `CLOSED_INCOMPLETE`, freeze actual records/progress, and disallow resume/edit; the next date allows a new start. Progress derives from completed sets / prescribed sets.
5. **Design persistence and cutover.** Add versioned plan/slot/routine/execution/check records and an idempotent backfill from `routine_assignments`/items into `SINGLE_DAY`. Preserve tenant/coach/student ownership, published snapshots, and historical dates. At cutover, all routine reads/writes use the unified model; retire old date-bound UI and stop creating legacy records. Migration and writes must be atomic.
6. **Add database security and tests.** Define grants/RLS/constraints for each mode, cycle slot ordering/coverage, per-exercise increments/units, unique set records per execution/item/set number, one start per student/day, closed execution immutability, and valid ownership. Add allow/deny tests for coach/student scope, draft privacy, migration fidelity, concurrent starts, same-day resume, end-of-day closure/frozen progress, next-day eligibility, slot attempt exhaustion, and progression by completed executions only.
7. **Add typed repositories and the UI.** Save/publish either mode through the same plan repository. Coach selects the single date or cycle mode; in cycle mode enters N days and authors one routine/progression per cycle-day slot. Student sees calendar/week selector, “Lo que ya hiciste hoy”, and available routines; the date records execution history and does not determine the cycle slot. Keep the one-routine-per-calendar-day, same-day resume, end-of-day close, blocked second start, and next-day allowance behaviors.
8. **Verify and release.** Run domain/unit tests, typecheck/lint/build and local pgTAP; validate backfill ownership/snapshots and rollback readiness; browser-check both coach modes and student flows, out-of-order slot choices, one start per day including concurrent requests, day-end close/frozen progress, next-day start eligibility, progress persistence, and responsive states. Cut over and remove old routine paths only after migration checks pass.

Do not begin CU-04 persistence until CU-03 plan/slot progression and generated prescriptions are stable; student performance must reference the published routine version/slot without modifying its targets.

CU-02 uses two sources: a cross-tenant curated catalog that clients can read but never edit, and a tenant-owned library with CRUD for active authorized coaches. Copying a catalog entry creates an independent tenant-owned snapshot with source provenance; it does not create a live link. Archive instead of hard-delete by default so future assignment/history references remain valid. Current `coach_admin` is the coach UI role; do not invent a separate `coach` database role without defining and testing its permission mapping. Keep enum values stable in storage and Spanish labels in UI. Production catalog records belong in reviewed, idempotent migrations; `supabase/seed.sql` is local-only and must not be applied to Production. CU-02 currently uses Supabase directly; do not add a parallel mock adapter unless an explicit demo mode is requested.

Recommended CU-02 slice order: (1) separate exercise definition from prescription types with an explicit legacy mapper; (2) add global catalog and tenant-owned schema, constraints, grants, archive/provenance, and RLS; (3) add pgTAP allow/deny and cross-tenant copy-isolation tests; (4) add stable seed data; (5) add repository contract and Supabase adapter; (6) implement search/filter and shared/read-only versus gym-owned UI, then create/edit/copy/archive flows; (7) verify coach and member roles, inactive/suspended cases, reload persistence, and phone/full responsive layouts. CU-03 assignment snapshots must retain the chosen definition when the catalog or gym copy changes later.

## Placement

- Domain model: `src/domain/<entity>.ts`.
- Fixtures: keep test data near its tests or in an explicitly named test-support module; add a production demo adapter only when a user-facing demo mode is a stated requirement.
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
