# AGS Data and State Contracts

## Boundaries

- `src/domain/`: business contracts, pure validation, and pure calculations. No React or browser APIs.
- `src/data/`: fixtures, repositories, services, and storage adapters.
- `src/screens/`: route-level composition.
- `src/components/`: reusable presentation and interaction.
- `src/app/`: composition, shell, navigation, session, and tenant bootstrap.

Screens and components must not import fixtures directly or call Supabase, `fetch`, or browser storage directly.

For CU-00, use `src/domain/tenant.ts` for typed payloads and validators, `src/data/tenantRepository.ts` for the public RPC, and `src/app/tenant/` for subdomain parsing/bootstrap state. Before login, the browser may call only `resolve_tenant_by_subdomain`; never query all tenant rows or expose private tenant fields.

## Repository Rules

- Keep Supabase CLI configuration at the project root and version SQL migrations under `supabase/migrations/`; do not store deployable SQL under `src/`.
- Keep database migrations reproducible and reviewed; never apply an untested schema migration directly to production.
- Add pgTAP tests under `supabase/tests/` for database grants, RLS allow/deny behavior, and security-sensitive RPCs; run `npx supabase test db` against the local stack before considering SQL changes complete.
- Authenticated data policies must require an `ACTIVE` profile and `ACTIVE` tenant. The user may read their own profile status to render a blocked message; an active coach may inspect inactive profiles in their own active tenant for membership administration.
- Keep repository contracts independent from Supabase.
- Return copies from reads and use immutable writes.
- Validate every persisted or external payload before use.
- Add versioning/migration when a serialized shape changes.
- Expose loading and error results through feature hooks when reads become asynchronous.
- Keep integration details inside a small adapter or service.

## Routine Model

Current prototype shape:

```ts
type RoutineMap = Record<Day, Exercise[]>;
```

Product shape:

```ts
type StudentRoutineMap = Record<TenantId, Record<StudentId, RoutineMap>>;
```

For real scheduling, prefer explicit assignment records with date, publication state, author, timestamps, and audit fields. Templates are reusable definitions; assignments are student-specific copies or references with per-exercise overrides. Editing a template must not silently change a published assignment.

## Progress Model

Keep these separate:

- Target load.
- Actual load.
- RPE.
- Set completion.
- Workout session.
- Historical record.
- Personal record.

Derive daily, weekly, streak, and progression metrics from one repository-owned source of truth. Do not hardcode separate totals in multiple screens.

## Offline Model

Offline support requires an event/sync model, not only a localStorage write. Keep local drafts/events separate from server records, use stable event IDs and timestamps, define retry and conflict behavior, and expose sync status. Prefer IndexedDB for non-trivial workout logs; use localStorage for small preferences or drafts.

## Authentication Data

Session, profile, role, and tenant are different state concepts. Validate tenant ownership and profile status after authentication. Never trust client-provided tenant IDs, roles, permissions, or feature flags.
