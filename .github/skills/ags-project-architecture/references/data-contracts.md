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

### CU-03 Training Cycles And Progression (Planned Extension)

The deployed CU-03 model stores one student-specific assignment per calendar date; those records are migration input only. The target is one unified coach programming model with two explicit modes: a routine scheduled for one selected calendar date (`SINGLE_DAY`), or a cycle containing N ordered cycle-day slots (`CYCLE`). Cycle-day slots are ordinal plan positions, not calendar dates or weekdays. Migrate existing assignments, prescriptions, execution history, and immutable snapshots into the unified model without data loss; do not retain the old implementation as a parallel workflow after cutover.

Planning contract (field names are illustrative until the schema plan is approved):

```ts
interface ProgramBase {
	id: string;
	tenantId: string;
	coachId: string;
	studentId: string;
	status: 'DRAFT' | 'PUBLISHED';
}

interface SingleDayProgram extends ProgramBase {
	mode: 'SINGLE_DAY';
	scheduledDate: string;
	routine: RoutinePlan;
}

interface TrainingCycle extends ProgramBase {
	mode: 'CYCLE';
	additionalCycleRepeats: number;
	cycleDays: CycleDay[];
}

type PersonalizedProgram = SingleDayProgram | TrainingCycle;

interface CycleDay {
	id: string;
	cycleId: string;
	position: number;
	routine: CycleRoutine;
}

interface RoutinePlan {
	id: string;
	version: number;
	items: Array<{
		id: string;
		exerciseSnapshot: Exercise;
		prescribedSets: number;
		prescribedRepetitions: number;
		prescribedLoad: number | null;
	}>;
}

interface CycleRoutine extends RoutinePlan {
	items: Array<RoutinePlan['items'][number] & {
		progression: {
			repetitionsIncrement: number;
			loadIncrement: number;
			loadUnit: 'lbs' | 'kg';
		};
	}>;
}

interface RoutineExecution {
	id: string;
	programId: string;
	programMode: 'SINGLE_DAY' | 'CYCLE';
	cycleIteration: number | null;
	cycleDayId: string | null;
	routineId: string;
	studentId: string;
	startedOn: string;
	startedAt: string;
	completedAt: string | null;
	closedAt: string | null;
	status: 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED_INCOMPLETE';
}

interface ExerciseCompletionCheck {
	routineExecutionId: string;
	cycleRoutineItemId: string;
	completedAt: string;
}
```

-- In `SINGLE_DAY` mode, the coach selects one calendar date and programs one routine. In `CYCLE` mode, the coach chooses positive integer N and defines one routine for each ordered cycle-day slot 1..N. These slots do not correspond to weekdays or fixed calendar dates. If a published `SINGLE_DAY` program exists for the student on a calendar date, it takes precedence for that date: display its routine and do not offer or allow starting a `CYCLE` routine that day.
- The coach sets a nonnegative whole-number `additionalCycleRepeats`; 0 means run only the authored cycle once. The authored cycle is the initial iteration; total iterations equal `1 + additionalCycleRepeats` (for example, 2 additional repeats means 3 total iterations). Progression is defined independently on each exercise in each cycle-day routine, using integer repetition/load increments and an explicit `lbs` or `kg` unit. On a subsequent iteration, add that exercise's configured increments to its prior-iteration target for the same cycle-day slot; never convert units implicitly.
- During cycle mode, the student calendar groups actual execution dates and history but does not select a cycle-day slot. The student chooses an available cycle routine; persist the chosen slot/routine, iteration, and actual local execution date. A student may start at most one routine per actual calendar date. The same execution can resume only on its start date. At day end, an incomplete execution closes as `CLOSED_INCOMPLETE`; checks/progress freeze and remain viewable, but it cannot be resumed or edited. The closed execution does not consume the next date's allowance. A different same-day start is rejected with the documented Spanish message.
- Define the cycle-iteration advancement rule before generating progression: confirm whether all N slots must be completed once before advancing, how out-of-order choices behave, and whether a closed-incomplete slot may be retried in a later date/iteration. Do not infer this from calendar dates.
- Exercise progress is derived as `100 * distinct completed checks / total exercise count`; each exercise contributes equally. Completed executions remain viewable with no Play action. Do not store a mutable percentage that can disagree with checks.
- Generated prescriptions are deterministic and versioned. Editing a published plan must not rewrite prior iterations, executions, or snapshots. The single-day and cycle modes share the unified data/domain/repository model; the deployed date-bound schema is migrated and retired as a user workflow after backfill validation.

Repetition and load prescriptions, increments, and actual logged values are whole numbers; do not round them. In cycle mode, length is N ordinal slots, and the total iteration count is 1 + nonnegative additional repeats. Per-exercise increments/units and compounding from the prior iteration are confirmed; cycle advancement when slots are selected flexibly remains to be decided.

### CU-04 Actual Workout Records (Planned Extension)

Keep the published prescription separate from what the student performed. Actual performance must reference the student's published plan/routine version, cycle slot when applicable, execution, and routine exercise item; actual values never overwrite prescribed values or the immutable exercise snapshot.

```ts
interface ExercisePerformance {
	routineExecutionId: string;
	cycleRoutineItemId: string;
		sets: Array<{
		setNumber: number;
		completed: boolean;
		actualRepetitions: number | null;
		actualLoad: number | null;
		loadUnit: 'lbs' | 'kg' | null;
	}>;
	rir: number | null;
	rpePercent: number | null;
}
```

- Student records whole-number actual repetitions and load plus completion per performed set. Capture one RIR value in the inclusive range 1-10 and one RPE value in the inclusive range 0-100% once per exercise as perceived effort, not per set. The UI uses separate slider-style bars with visible minimum, maximum, and selected value. Validate bounds in the UI/domain and enforce them at persistence; reject invalid values rather than clamping or storing them. Preserve prescribed versus actual values as separate fields.
- Do not infer a conversion between RIR and RPE or add unconfirmed scale semantics beyond the agreed ranges.
- Workout session, per-exercise/set logs, timestamps, and ownership should be persisted under tenant/student/assignment. Only the assigned active student may write their own performance; the coach's read scope must remain limited to students they own.
- Offline synchronization is still out of scope until retry, idempotency, and conflict semantics are specified.

### CU-04B Coach Biometrics And Student Progress (Planned Extension)

The coach records dated body measurements for a student; the student can inspect their own measurement history and progress from their profile. This is separate from workout logs and from profile identity fields.

Planning contract: the biometric registration form is pending definition. A measurement record needs tenant, student, recording coach, measurement date/time, metric identifier, numeric value, and unit, with audit timestamps. The exact metric catalogue and form fields are not yet defined; do not invent required measurements or seed placeholder values. Decide whether one visit is represented by a measurement-session header plus multiple metric rows, or another versioned shape, after the client confirms the form.

RLS must allow only an active owning coach to create/correct records for their student in the same active tenant, and allow the active student to read only their own measurements. Student writes are not part of this requirement. Profile progress should combine persisted workout history and coach-entered biometrics with clear labels/source dates; never display demo metrics as real records. Confirm the metrics, units, correction/audit policy, visibility, and chart/table expectations before migration design.

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

Treat this as a planning contract, not a demand to persist those literal enum values without review. Keep Spanish labels in the UI and stable normalized keys in storage. Prefer controlled equipment/focus options with an explicit extensibility strategy; do not make emojis the taxonomy. CU-03 prescription items own sets, reps, target load, work duration, and rest. Legacy demo screens that still consume the combined `Exercise` type need an explicit mapper; never persist prescription defaults as global catalog facts.

Repository operations should expose explicit source/ownership, for example list shared records, list current-tenant records, create tenant exercise, copy shared exercise, update tenant exercise, and archive tenant exercise. The browser must not provide a trusted tenant or actor identity; derive both from the authenticated profile/JWT in RLS or trusted server-side code. Do not silently merge fixtures with Supabase results. Preserve loading, empty, permission-denied, validation, and network error states.

RLS/pgTAP coverage must prove: active signed-in users can read the shared catalog; clients cannot mutate shared rows; coach CRUD is limited to the caller's active tenant; one gym cannot read/update/archive another gym's exercises; members cannot perform coach writes; inactive profiles and suspended tenants cannot use tenant-owned library data; copying preserves content/provenance but isolates subsequent updates; archived records remain unavailable for new assignment selection. Add safe deterministic catalog seeds without fake Auth users or personal data.

CU-02 `exercise_catalog` and `tenant_exercises` tables, RLS, and 15 shared catalog records are deployed through migrations 012-014. The coach screen uses a typed Supabase repository for catalog and tenant-owned exercises, with create/copy/edit/archive/restore operations. CU-03 routine assignments/items and coach/student repositories are persisted and deployed through migrations 015-016; CU-04 workout execution/session logs and CU-04B biometrics do not yet have persistence. Use `project-status.md` for current browser/deployment verification. The repository `supabase/seed.sql` is local-development setup (including development tenants); never execute it against Production.

For each persisted feature, choose one explicit source and keep SDK access behind a typed repository. A database/network/permission error must remain an error and must never fall back to fixtures. Keep mocks isolated for legacy demo screens and unit tests; do not require a duplicate mock adapter for a feature already committed to Supabase-only behavior.

Move data by vertical slice: add schema/constraints, grants/RLS and pgTAP allow/deny tests; add safe stable-ID catalog records through reviewed migrations; implement the Supabase repository; then verify the UI locally. Production catalog seeding is migration-backed and idempotent. `supabase/seed.sql` is local-only and also creates development tenants; never run it against Production. Do not put fake Auth users in SQL seeds: provision local coach/student identities through development-only scripts, then create user-owned assignments against those Auth IDs.

The legacy global `RoutineMap`/day-keyed array is not a product model and has been removed. Use explicit `PersonalizedProgram` records with a discriminated `SINGLE_DAY` or `CYCLE` mode. Reusable templates remain optional; cycle routines are versioned and student executions/checks reference the exact published routine version. Editing a template or plan must not silently rewrite published prescriptions or historical executions.

The deployed first CU-03 slice assigns one routine to one user and calendar date; its records are migration input, not a parallel target workflow. The unified target has two modes: `SINGLE_DAY` schedules one routine for a coach-selected date, while `CYCLE` contains N ordered cycle-day slots with one routine per slot. Cycle-day slots are ordinal program positions, never weekdays or actual calendar dates. The student calendar records actual executions/history; it does not choose the cycle slot. Every plan, cycle-day slot, routine version, execution, and exercise check must be tenant-owned and linked to the intended student. Students read only their own published plans/routines/executions; drafts remain coach-only. Migrate existing assignment snapshots/history before cutover. The old global `RoutineMap`/localStorage workflow was removed and must not be reintroduced as a parallel source.

Current CU-03 persistence is deployed in `routine_assignments` and `routine_assignment_items` (migrations 015-016). Each source assignment is scoped to one tenant, coach, personalized student, and calendar date; a unique constraint allows one assignment per student/date. Assignments have `DRAFT` and `PUBLISHED` states. Ordered items keep prescribed sets, reps, target load, work duration, and rest separate from the exercise definition. These tables are the migration source for the unified two-mode model and will be retired as the active routine workflow after validated cutover.

Planned `CYCLE` contract: store plan owner/scope, N ordered `CycleDay` slots, one versioned routine per slot, per-exercise progression, a nonnegative integer count of additional cycle repetitions, and plan version/status. The authored cycle is iteration one; total generated iterations equal `1 + additionalCycleRepeats`. Each cycle-day routine item stores integer rep/load increments and unit `lbs` or `kg`; on the same slot in the next iteration, add increments to the previous iteration's target. In `SINGLE_DAY` mode, store the selected scheduled date and one routine without cycle slots. Keep both modes under one typed plan model and repository; do not maintain the current date-bound schema as a second application workflow.

A student-started cycle execution records the cycle iteration, selected `CycleDay`/routine version, student, actual local start date/time, check-offs, and completion/closed-incomplete state. The calendar date is execution history, not the cycle slot. A student may start at most one routine per actual calendar date; resume is allowed only on that start date. Incomplete progress closes/fixes at day end and is view-only; it does not block a new routine on the next date. Derive progress from distinct checked exercises divided by the routine's exercise count, each equally weighted. The completed-cycle iteration rule is still to be confirmed for out-of-order slot selection and closed-incomplete attempts; do not advance progression until that rule is decided. Progress is derived, never independently mutable.

The database generates `exercise_snapshot` from the selected active catalog or same-tenant exercise on item insert; client-supplied snapshot content is ignored, and source/snapshot fields are immutable afterward. `save_routine_assignment_draft` atomically creates or replaces items on a coach-owned draft, deriving actor/tenant from the authenticated profile. `publish_routine_assignment` atomically requires a non-empty draft, active owned student, and active coach/tenant. Published assignments cannot be edited or unpublished in this first slice; future revisions require a versioning decision.

Current migrations 015-016 provide the source assignment behavior and security tests. The target unified model needs RLS/grants for coach-owned single-day/cycle plans, student-own starts/checks, and coach-scoped progress reads. Enforce the one-start-per-student/actual-date rule transactionally against concurrent Play requests; closed-incomplete and completed executions are immutable/read-only. Preserve snapshot, tenant, coach, and student ownership in backfill. CU-04 actual sets/RIR/RPE remain separate from CU-03 completion checks.

The former global `RoutineMap` and localStorage repository were removed as unused legacy code; do not reintroduce them as a parallel production data path. Keep any future test fixtures isolated from feature repositories.

An assigned exercise must retain the full `Exercise` definition: name, series, reps, weight, work duration when present, rest, emoji, muscles, instructions, tips, difficulty, and video reference when present. Keep the exercise catalog's defaults separate from assignment-specific prescription overrides. Published assignments must not lose or silently inherit changed exercise details; preserve the published version with an immutable reference or snapshot. The current contract makes `videoUrl` optional, so show an explicit unavailable state when an exercise has no video unless product requirements later make it mandatory.

Treat video as a validated media reference, not arbitrary iframe/HTML content. Current behavior accepts supported YouTube references for inline playback and displays other valid HTTPS URLs as external links; published assignments retain the video URL in their immutable exercise snapshot. If private media or Supabase Storage is introduced later, define its access and credential policy as a separate change without breaking library reads, assignment snapshots, or student playback.

## Progress Model

Keep these separate:

- Target load.
- Actual load.
- Prescribed repetitions versus actual repetitions.
- RPE.
- RIR.
- Set completion.
- Workout session.
- Historical record.
- Personal record.
- Coach-entered biometric measurement.

Keep RIR and RPE as separate measurements. Capture both once per exercise (not per set). RIR ranges from 1 to 10 and RPE from 0 to 100%; do not infer one from the other. Any scale labels or anchors beyond those ranges must not be invented.

For CU-04, persist the workout session, prescribed versus actual repetitions/load, and completion per set; persist one RIR and one RPE value per exercise. For CU-04B, persist coach-authored dated biometric measurements as a separate source of progress. Derive daily, weekly, streak, cycle-progression, and profile metrics from repository-owned records, not independent mock totals. Offline event queues and conflict resolution are deferred until separately specified; do not imply offline support from localStorage.

Biometric contract (planning only): record tenant, student, recording coach, measured-at date/time, metric key, numeric value, unit, and audit timestamps. Define the allowed metric catalogue, optionality, corrections/history, and profile visibility before implementation. The student may read their own records; writes are coach-only and scoped to the coach's active tenant and owned student.

## Offline Model

Offline support requires an event/sync model, not only a localStorage write. Keep local drafts/events separate from server records, use stable event IDs and timestamps, define retry and conflict behavior, and expose sync status. Prefer IndexedDB for non-trivial workout logs; use localStorage for small preferences or drafts.

## Authentication Data

Session, profile, role, and tenant are different state concepts. Validate tenant ownership and profile status after authentication. Never trust client-provided tenant IDs, roles, permissions, or feature flags.

CU-01 uses `src/data/authRepository.ts` and `src/app/session/AuthProvider.tsx`. Public self-signup is disabled. Provision profiles only through trusted local administration for development or secured server-side processes; the browser must not choose a role or `tenant_id`. The local smoke test `scripts/smoke-cu01-local.ps1` verifies signup denial, password sign-in, `getUser`, and the caller's own profile read, then deletes its transient user. `super_admin` sees a platform-not-ready state and `user_general` remains blocked until their modules exist; neither is mapped to coach/student screens.

CU-01B is the trusted membership-onboarding flow: the coach UI calls `supabase/functions/invite-personalized-member`, which validates the caller session and active coach profile, derives the tenant server-side, sends/links the Auth invite, and marks unlinked failed attempts as failed. It does not enforce `tenants.max_clients`. The invitee follows the emailed link, verifies the invited Auth session, sets a password (minimum 10 characters), and submits a display name; `supabase/functions/accept-personalized-invitation` then calls `accept_personalized_invitation` to atomically activate a `user_personalized` profile. A linked member's expired access link can be resent and does not deactivate the account; the member remains active until disabled by the coach-admin. This is separate from group-class booking, and personalized workouts are programmed by the coach for the user. Local development uses Supabase's email catcher; hosted Auth email/redirect settings are managed outside client code and their current status belongs in `project-status.md`.

Email sender policy: production Auth/invitation messages use one platform-controlled, domain-authenticated transactional sender across gyms; gym name and inviter identity belong in validated message content, not a coach-selected From address. Add a Reply-To only from trusted, verified contact data. Per-tenant sender domains require a separate domain-verification and credential-management feature. The Gmail SMTP helper is for local real-delivery testing only; its Gmail account is not the production sender and its App Password must not be committed or placed in Vite variables.

Current CU-03 date-bound assignments are persisted and provide the migration source for the target flexible-cycle model; after validated cutover, the cycle model is the sole routine workflow. CU-03 cycle executions/check-offs, CU-04 actual performance, and CU-04B biometrics/progress are not yet persisted. Demo fixtures must not be presented as real member data; the migrated Supabase flow must show published cycle routines or a truthful empty/awaiting-programming state.

An invitation joins a person to the gym and grants app access; it does not reserve a class. Current CU-01B provisions personalized members only: the invitation row has no service-track field and acceptance always creates `user_personalized`. Before group access is enabled, extend onboarding to select personalized, group classes, or both. Keep one Auth identity/profile per member and represent service access in a server-owned `member_service_access` (or equivalent entitlement) relation; do not add a `both` role. A dual-access member sees published coach-assigned programming as the primary home and group classes as a separate destination. Group-class schedules/bookings and personalized assignments/execution remain separate domain data and states. `tenants.max_clients` is not enforced by current personalized membership operations; do not count pending invitations against it or use it for class capacity. Any future unique-member limit needs a separate product decision and implementation. Record the responsible coach explicitly on the personalized access/assignment; `tenant_invitations.invited_by` is only the invitation audit actor.
