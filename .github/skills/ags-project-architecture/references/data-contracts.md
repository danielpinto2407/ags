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
- A coach invitation must be initiated through a tenant-scoped UI but executed by a trusted server-side operation. That operation validates the active coach/tenant, email identity, expiry, and one-time acceptance, sends the invitation email, and assigns `user_personalized` plus `tenant_id`; never expose the Supabase service-role key or accept role/tenant assignments from the browser. Personalized invitation, acceptance, and reactivation do not enforce `tenants.max_clients` or reserve seats.
- Treat invitations as gym membership onboarding, never class bookings. Link expiry controls account setup only; an accepted member remains active until the coach-admin inactivates the profile. `tenants.max_clients` is a retained setting, not an active personalized-member limit. Any future gym-wide member cap or CU-10 per-class capacity requires a separate product decision.
- Keep repository contracts independent from Supabase.
- Return copies from reads and use immutable writes.
- Validate every persisted or external payload before use.
- Add versioning/migration when a serialized shape changes.
- Expose loading and error results through feature hooks when reads become asynchronous.
- Keep integration details inside a small adapter or service.

## Routine Model

## Exercise Library Model (CU-02)

Treat the shared catalog and gym library as separate sources with separate permissions:

- `exercise_catalog`: curated cross-tenant reference records. Active authenticated users may read records needed for the library and their assigned-workout experience. Client roles receive no insert/update/delete grants. Initial records are seeded with stable IDs and original AGS-authored descriptions; seed upserts must not overwrite curator-edited content.
- `tenant_exercises`: gym-owned records. Every row has a non-null `tenant_id`; only an active authorized coach in that active tenant may create, read, update, archive, or restore its records. Members do not receive library management access.
- A copy from catalog to gym inserts a new `tenant_exercises` record, copies the source definition as it exists at copy time, and stores `source_catalog_exercise_id` for provenance. It is an independent snapshot, not a live relation. Never update the catalog as a side effect of editing a copy.

Prefer distinct tables over a nullable-tenant single table so immutable global rows cannot accidentally inherit tenant write policies. Add foreign keys, `created_by`/`updated_by` where they can be validated against the current actor, timestamps, `archived_at`, checks for non-empty names/valid difficulty/media, and indexes for tenant plus common filters/search. Avoid arbitrary uniqueness constraints such as globally unique names unless product behavior explicitly requires them. Define delete as archive by default; prevent archived rows from appearing in new routine selection while preserving references and immutable assignment snapshots.

The reusable exercise definition should be independent from workout prescription. Proposed typed shape:

```ts
interface ExerciseDefinition {
	id: string;
	name: string;
	focus: 'glutes' | 'upper_body' | 'core' | 'full_body';
	primaryMuscles: string[];
	secondaryMuscles: string[];
	equipment: string[];
	movementPattern: string;
	difficulty: 'Principiante' | 'Intermedio' | 'Avanzado';
	instructions: string;
	tips: string;
	videoUrl?: string;
}
```

Treat this as a planning contract, not a demand to persist those literal enum values without review. Keep Spanish labels in the UI and stable normalized keys in storage. Prefer controlled equipment/focus options with an explicit extensibility strategy; do not make emojis the taxonomy. CU-03 prescription items own sets, reps, target load, work duration, and rest. Until CU-03 is migrated, use an explicit mapper for screens that still consume the legacy combined `Exercise` type; never persist prescription defaults as global catalog facts.

Repository operations should expose explicit source/ownership, for example list shared records, list current-tenant records, create tenant exercise, copy shared exercise, update tenant exercise, and archive tenant exercise. The browser must not provide a trusted tenant or actor identity; derive both from the authenticated profile/JWT in RLS or trusted server-side code. Do not silently merge fixtures with Supabase results. Preserve loading, empty, permission-denied, validation, and network error states.

RLS/pgTAP coverage must prove: active signed-in users can read the shared catalog; clients cannot mutate shared rows; coach CRUD is limited to the caller's active tenant; one gym cannot read/update/archive another gym's exercises; members cannot perform coach writes; inactive profiles and suspended tenants cannot use tenant-owned library data; copying preserves content/provenance but isolates subsequent updates; archived records remain unavailable for new assignment selection. Add safe deterministic catalog seeds without fake Auth users or personal data.

CU-02 `exercise_catalog` and `tenant_exercises` tables, RLS, and 15 shared catalog records are deployed through migrations 012-014. The coach screen uses a typed Supabase repository for catalog and tenant-owned exercises, with create/copy/edit/archive/restore operations. Routine assignments and workout logs still do not have database tables or Supabase adapters. Use `project-status.md` for current browser/deployment verification. The repository `supabase/seed.sql` is local-development setup (including development tenants); never execute it against Production.

For each persisted feature, choose one explicit source and keep SDK access behind a typed repository. A database/network/permission error must remain an error and must never fall back to fixtures. Keep mocks isolated for legacy demo screens and unit tests; do not require a duplicate mock adapter for a feature already committed to Supabase-only behavior.

Move data by vertical slice: add schema/constraints, grants/RLS and pgTAP allow/deny tests; add safe stable-ID catalog records through reviewed migrations; implement the Supabase repository; then verify the UI locally. Production catalog seeding is migration-backed and idempotent. `supabase/seed.sql` is local-only and also creates development tenants; never run it against Production. Do not put fake Auth users in SQL seeds: provision local coach/student identities through development-only scripts, then create user-owned assignments against those Auth IDs.

Current prototype shape:

```ts
type RoutineMap = Record<Day, Exercise[]>;
```

Product shape:

```ts
type StudentRoutineMap = Record<TenantId, Record<StudentId, RoutineMap>>;
```

For real scheduling, prefer explicit assignment records with date, publication state, author, timestamps, and audit fields. Templates are reusable definitions; assignments are student-specific copies or references with per-exercise overrides. Editing a template must not silently change a published assignment.

The first personalized MVP must assign directly to one user and date/day slot; reusable templates are optional and must not block this end-to-end workflow. Every assignment and item must be tenant-owned and linked to its intended student. A student may read only their own published assignments; draft assignments remain coach-only. The current global `RoutineMap` and localStorage persistence are prototype-only and must not be treated as per-student data.
CU-03 persistence is implemented locally in `routine_assignments` and `routine_assignment_items` (migrations 015-016). Each assignment is scoped to one tenant, coach, personalized student, and calendar date; a unique constraint allows one assignment per student/date. Assignments have `DRAFT` and `PUBLISHED` states. Ordered items keep prescribed sets, reps, target load, work duration, and rest separate from the exercise definition.

The database generates `exercise_snapshot` from the selected active catalog or same-tenant exercise on item insert; client-supplied snapshot content is ignored, and source/snapshot fields are immutable afterward. `save_routine_assignment_draft` atomically creates or replaces items on a coach-owned draft, deriving actor/tenant from the authenticated profile. `publish_routine_assignment` atomically requires a non-empty draft, active owned student, and active coach/tenant. Published assignments cannot be edited or unpublished in this first slice; future revisions require a versioning decision.

RLS exposes drafts and published assignments to their active owning coach; a personalized student can read only their own published assignment and its items. Members cannot write assignments/items. Tests cover tenant/coach/student ownership, wrong-source exercises, inactive actors, empty publication, snapshot immutability, draft invisibility, and publication visibility. These migrations and policies are validated in local Supabase only; Production remains at migration 014 pending review/approval. CU-04 completion records are not yet modeled.

The legacy global `RoutineMap` and localStorage persistence remain only in mock/prototype paths; they are not per-student data and must not be used by the persisted assignment flow.

An assigned exercise must retain the full `Exercise` definition: name, series, reps, weight, work duration when present, rest, emoji, muscles, instructions, tips, difficulty, and video reference when present. Keep the exercise catalog's defaults separate from assignment-specific prescription overrides. Published assignments must not lose or silently inherit changed exercise details; preserve the published version with an immutable reference or snapshot. The current contract makes `videoUrl` optional, so show an explicit unavailable state when an exercise has no video unless product requirements later make it mandatory.

Treat video as a validated media reference, not arbitrary iframe/HTML content. The storage choice (approved HTTPS provider URL versus Supabase Storage) can be decided when CU-02 is implemented; whichever is chosen must survive library reads, assignment publication, and student playback without exposing private storage credentials.

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

For the first execution flow, persist the workout session and per-exercise/set completion, including prescribed versus actual values. Offline event queues and conflict resolution are deferred until separately specified; do not imply offline support from localStorage.

## Offline Model

Offline support requires an event/sync model, not only a localStorage write. Keep local drafts/events separate from server records, use stable event IDs and timestamps, define retry and conflict behavior, and expose sync status. Prefer IndexedDB for non-trivial workout logs; use localStorage for small preferences or drafts.

## Authentication Data

Session, profile, role, and tenant are different state concepts. Validate tenant ownership and profile status after authentication. Never trust client-provided tenant IDs, roles, permissions, or feature flags.

CU-01 uses `src/data/authRepository.ts` and `src/app/session/AuthProvider.tsx`. Public self-signup is disabled. Provision profiles only through trusted local administration for development or secured server-side processes; the browser must not choose a role or `tenant_id`. The local smoke test `scripts/smoke-cu01-local.ps1` verifies signup denial, password sign-in, `getUser`, and the caller's own profile read, then deletes its transient user. `super_admin` sees a platform-not-ready state and `user_general` remains blocked until their modules exist; neither is mapped to coach/student screens.

CU-01B is the trusted membership-onboarding flow: the coach UI calls `supabase/functions/invite-personalized-member`, which validates the caller session and active coach profile, derives the tenant server-side, sends/links the Auth invite, and marks unlinked failed attempts as failed. It does not enforce `tenants.max_clients`. The invitee follows the emailed link, verifies the invited Auth session, sets a password (minimum 10 characters), and submits a display name; `supabase/functions/accept-personalized-invitation` then calls `accept_personalized_invitation` to atomically activate a `user_personalized` profile. A linked member's expired access link can be resent and does not deactivate the account; the member remains active until disabled by the coach-admin. This is separate from group-class booking, and personalized workouts are programmed by the coach for the user. Local development uses Supabase's email catcher; hosted Auth email/redirect settings are managed outside client code and their current status belongs in `project-status.md`.

Email sender policy: production Auth/invitation messages use one platform-controlled, domain-authenticated transactional sender across gyms; gym name and inviter identity belong in validated message content, not a coach-selected From address. Add a Reply-To only from trusted, verified contact data. Per-tenant sender domains require a separate domain-verification and credential-management feature. The Gmail SMTP helper is for local real-delivery testing only; its Gmail account is not the production sender and its App Password must not be committed or placed in Vite variables.

Until CU-03/CU-04 persistence is complete, the student home/routines still show mock data. Never present those sample routines, coach details, streaks, or metrics as data assigned to a newly invited member; use a truthful empty/awaiting-programming state in the real Supabase member flow.

An invitation joins a person to the gym and grants app access; it does not reserve a class. Current CU-01B provisions personalized members only: the invitation row has no service-track field and acceptance always creates `user_personalized`. Before group access is enabled, extend onboarding to select personalized, group classes, or both. Keep one Auth identity/profile per member and represent service access in a server-owned `member_service_access` (or equivalent entitlement) relation; do not add a `both` role. A dual-access member sees published coach-assigned programming as the primary home and group classes as a separate destination. Group-class schedules/bookings and personalized assignments/execution remain separate domain data and states. `tenants.max_clients` is not enforced by current personalized membership operations; do not count pending invitations against it or use it for class capacity. Any future unique-member limit needs a separate product decision and implementation. Record the responsible coach explicitly on the personalized access/assignment; `tenant_invitations.invited_by` is only the invitation audit actor.
