# AGS Data and State Contracts

## Boundaries

- `src/domain/`: business contracts, pure validation, and pure calculations. No React or browser APIs.
- `src/data/`: fixtures, repositories, services, and storage adapters.
- `src/screens/`: route-level composition.
- `src/components/`: reusable presentation and interaction.
- `src/app/`: composition, shell, navigation, session, and tenant bootstrap.

Screens and components must not import fixtures directly or call Supabase, `fetch`, or browser storage directly.

## Repository Rules

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
