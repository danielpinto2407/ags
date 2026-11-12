# AGS Product Context

## Product

AGS GluteHouse is a multi-tenant fitness SaaS under active development. The React/Vite application and Supabase-backed tenant, authentication, exercise-library, and date-bound routine-assignment slices are deployed; the unified `SINGLE_DAY`/`CYCLE` programming model, cycle execution, and real student progress are not yet persisted. The student progress screen shows an empty state until real records exist. Use cases define intended behavior, while `project-status.md` records verified implementation and deployment state.

## Actors

- `super_admin`: manages gyms, plans, capacity, feature flags, themes, billing state, and suspension.
- `coach_admin`: invites members to the gym by email, manages tenant-owned exercises, and assigns personalized routines to the members they coach.
- `user_personalized`: gym member with personalized service access; views a single-day program or cycle routines, chooses a cycle-day routine to execute on actual calendar dates, tracks exercise completion/training data, and views progress. The same account may also have group-class access.
- `user_general`: group-only gym member when CU-10 is implemented; discovers and books group classes, without a personalized program unless personalized access is also granted.
- Unauthenticated visitor: resolves the gym and theme before login.

## Use-Case Map And Priority

| Case | Behavior | Status |
|---|---|---|
| CU-00 | Detect tenant by subdomain, load theme, handle unknown/suspended tenant | tenant resolver and AGS theme are deployed; production custom domain/DNS pending |
| CU-01 | Authenticate, validate profile/tenant, redirect by role | password sign-in/session/profile flow is deployed and Production login is verified; PR #17/#18 session-continuity and contextual-navigation fixes are integrated |
| CU-01B | Coach invites one member to the gym by email; current onboarding grants personalized access | invite/acceptance and active/inactive lifecycle are implemented; group entitlements are deferred. Personalized membership operations do not enforce `tenants.max_clients` |
| CU-02 | Browse the shared immutable exercise catalog and create/manage a gym-owned exercise library; coaches may copy a shared exercise as the starting point for an independently editable gym exercise | schema/RLS, 15-record shared catalog, and coach CRUD UI are deployed in Production and browser-checked; see project status for exact verification scope |
| CU-02B | Create reusable routine templates and reorder items | planned; optional after direct personalized assignment works |
| CU-03 | Coach programs either a single routine for a selected calendar date or a cycle of N ordered cycle-day slots, each with its own routine and per-exercise progression; the student chooses an available cycle routine to perform on actual calendar dates | Current date-bound assignments are deployed and will be migrated. The target unified model supports `SINGLE_DAY` and `CYCLE` modes; cycle slots are ordinal plan positions, not calendar dates. Student executions, progress, and exercise check-offs remain planned |
| CU-04 | Student executes published programming and records completion plus actual reps/load, RIR 1-10, and RPE percentage per exercise | Published routine reading is deployed. Session/set persistence, actual performance, per-exercise RIR/RPE, and cycle-aware execution are planned; offline sync deferred |
| CU-04B | Coach records dated body measurements; student sees longitudinal training and biometric progress in their profile | Planned. Workout history/progression and coach-entered biometric measurements/profile views are not implemented; biometric form and metric catalogue are pending definition |
| CU-05 | Exercise detail, inline video, rest timer, sound/vibration alert | Exercise detail and supported inline YouTube playback are deployed; timer is client-side; sound/vibration and expanded provider support remain future work |
| CU-06 | Direct WhatsApp contact with coach | placeholder; supporting experience |
| CU-07 | Super-admin gym, plan, member limit, theme, and subscription management | planned |
| CU-08 | Feature flags by gym and plan | planned |
| CU-09 | Suspend/reactivate gym access | planned |
| CU-10 (proposed) | Group classes: schedules, per-class capacity, booking, attendance, and `user_general` access | deferred until after the personalized-training MVP |

### Personalized-Training MVP Order

1. CU-01B: the coach enters an invitee's email in the tenant UI; the invitee receives an email, accepts it, and completes account setup. A trusted server-side flow validates the active coach and tenant, creates the invitation/account/profile, and assigns `user_personalized` and `tenant_id`; the browser never chooses either value. Public self-signup remains disabled.
2. CU-02: provide two sources in one coach-facing library: a curated cross-tenant catalog that authenticated users can read but cannot edit, and tenant-owned exercises that authorized coaches can create, read, update, and archive. A coach may copy a shared exercise into their gym as a starting point; the copy is independently editable and never changes the shared source or another gym's copy. Seed stable-ID, original AGS-authored exercise records idempotently after schema/RLS exists. Production catalog records use reviewed migrations; `supabase/seed.sql` is local-only and also creates development tenants.
3. Migrate CU-03 to one unified programming model with two explicit modes. In `SINGLE_DAY`, the coach selects one calendar date and programs one routine for it. In `CYCLE`, the coach chooses a positive number N of cycle-day slots and programs one routine for each ordinal slot (Day 1..N), with independent per-exercise integer rep/load progression. These cycle-day numbers are plan positions, not weekday labels or calendar dates. The authored cycle is its first iteration; the coach's additional-repeat count adds further iterations (total iterations = 1 + additional repeats). Progression for each exercise compounds from its target in the preceding iteration of the same cycle slot, preserving `lbs` or `kg`. If a published `SINGLE_DAY` routine exists for a student on the selected calendar date, it takes precedence: show that routine and do not allow starting a `CYCLE` routine that date.
	Migrate current date-bound assignments and immutable snapshots into the unified model before cutover. Match the student screen hierarchy: calendar/week selector, “Lo que ya hiciste hoy” activity list, then “Escoge tu siguiente entrenamiento”. In cycle mode, cycle routines are available choices independent of actual calendar date; the calendar records execution dates but does not dictate cycle slot. The student may start at most one routine per actual calendar date, may resume it only that day, and at day end incomplete progress freezes and closes without resume/edit; a new routine can be started the following date. A different same-day start shows: “Ya tienes una rutina en curso o terminada hoy. Continúa esa rutina o vuelve mañana para iniciar otra.” Exercise checks derive progress; completed routines remain viewable without Play. Retire the old implementation in favor of the unified model after migration. Keep the cycle-round completion rule open: define when all N slots count as one completed iteration, including out-of-order choices and abandoned/closed attempts.
4. Extend CU-04 from published-routine reading to execution records: student logs whole-number actual reps/load and completion per set, plus one RIR value (1-10) and one RPE value (0-100%) per exercise. Present RIR and RPE as separate slider-style bars with visible minimum/maximum and current value; constrain selection to each range and reject out-of-range values. Preserve prescription and actual values separately. Offline synchronization remains deferred and must be specified separately.
5. Add CU-04B coach-authored dated biometric records and student-only history/profile visualization alongside persisted workout progress. The biometric form and metric catalogue are pending client definition; do not invent the measurement list or display mock data as recorded values.

The target personalized acceptance path is invite email -> account activation -> coach plans/publishes a cycle -> student records performed training -> coach records biometrics -> student reviews progress in profile. The currently implemented vertical slice reaches single-date assignment publication and student reading; cycle progression, execution logging, biometrics, and profile history remain planned. Each step must preserve tenant, coach, and student ownership. Do not start group-class scheduling, booking, or attendance as part of this MVP.

### New Client Requirements (Planning Baseline)

- CU-03 has two coach programming modes in one target model: `SINGLE_DAY` schedules one routine on a selected calendar date; `CYCLE` contains N ordinal cycle-day slots with one routine and independent per-exercise rep/load progression per slot. Cycle slots are not calendar dates. The authored cycle is iteration one; the coach chooses additional repeats, so total iterations equal one plus that count. Per-exercise progression compounds from the previous iteration's target for the same slot. In cycle mode, the student's calendar shows actual execution dates and history while routines remain flexibly selectable; date never determines the cycle slot. The student may start one routine per calendar day, resume only that routine on its start date, and has unfinished progress frozen/closed at day end; the next day permits a new start. A different same-day start is blocked with the specified message. Checks derive progress; completed routines are view-only. Existing date-bound records must be migrated into the unified model. The exact rule for completing a cycle iteration when slots are selected out of order or an attempt closes incomplete still needs product confirmation.
- CU-04 records what the student actually performed, not only the prescription: actual repetitions/load and completion per set, with RIR (1-10) and RPE (0-100%) captured once per exercise as perceived effort. Show each metric in its own slider-style bar with visible bounds and selected value; selection must stay within the inclusive range. Repetitions and loads are whole numbers; no rounding is applied. Store actual and prescribed values separately and preserve the `lbs`/`kg` unit.
- CU-04B adds coach-authored, dated biometric measurement records for a student and student-readable history in that student's profile. The biometric registration form and exact metric catalogue/units are pending definition. Records must be scoped to tenant/student, attributable to the coach, and auditable by date; do not invent measurement fields or present mock values as real.
- These requirements replace the current date-bound CU-03 workflow; they are not implemented by the existing assignment tables or prototype check-off. Migrate current assignment data before cutover. Keep group classes deferred.

### Decisions To Close Before Schema/Implementation

- Define the cycle-iteration completion rule: whether all N slots must be completed once before the next iteration becomes available, how out-of-order choices behave, and how closed-incomplete attempts affect slot completion/retry.
- A routine has one progress state per execution. Play resumes it only on its start date; at that date's end, incomplete progress freezes as closed-incomplete and is view-only. A new calendar day permits a new routine start. A later cycle iteration receives fresh progress/check-offs.
- Any RIR/RPE scale labels or interpretation beyond the confirmed numeric ranges remain to be confirmed; do not infer a conversion between the scales.
- Define the pending biometric registration form: metric catalogue, units, optionality, edit/correction policy, and whether the student sees every metric or coach-selected metrics.
- Decide if biometrics and workout progress are charts, dated tables, or both, and define empty states and privacy/access rules. Do not infer metrics from mock/profile placeholders.

### Invited Member Experience


## Target Global Sender Policy for Production

The target is one platform-controlled transactional sender for all gyms, for example `AGS GluteHouse <invitaciones@auth.tugimnasioapp.com>` once ownership of that domain is confirmed and SPF, DKIM, and DMARC are configured. This is a target policy, not the current Production configuration; see `project-status.md` for the verified sender in use. Invitation subject/body should clearly show the gym name and coach who invited the member. Use a gym/coach `Reply-To` only after a trusted contact email is part of the server-side profile contract. Coaches must not supply arbitrary From addresses. This keeps domain verification, reputation, credentials, bounce handling, and templates under platform control while preserving each gym's identity in the message.

Per-gym From addresses are deferred. They require each gym to prove domain ownership and configure sender authentication; do not offer them as a simple coach setting. If later required, implement a verified tenant sender-domain onboarding flow with server-side credentials and delivery monitoring.

## Local Gmail SMTP for Testing

The Gmail SMTP helper is a local delivery test only. It sends from the developer's Gmail account to a recipient entered in the invitation form; it does not imply per-gym senders or define the target production From identity. Use a Google App Password (never the normal Gmail password) and remove/revoke it after testing if no longer needed. Production currently uses the temporary low-volume sender documented in `project-status.md`; migrate to the platform-controlled transactional sender above when the sending domain is verified.
## Exercise And Mock-Data Preservation

CU-02 has a shared, read-only catalog and a separate gym-owned library. Coaches may copy shared exercises as independent gym-owned records; editing a copy never changes its source or other gyms. Normal deletion is archive. The current coach role is `coach_admin`; there is no separate `coach` database role.

Seeded coaching descriptions are original AGS content; do not copy third-party descriptions/media or make unsupported clinical claims. The typed exercise-definition fields, storage enums, provenance, RLS, and mapping to future prescriptions are specified in `data-contracts.md`.

The shared catalog is immutable to client roles. Active coaches may manage exercises only in their active gym; members consume exercise details through their own published assignments and do not manage the library. Any new role or permission change must be defined and tested server-side.

Published routines must retain the exercise details used at publication; the exact snapshot/version contract belongs to CU-03. Video is optional and must be a validated HTTPS reference with a clear no-video state.

CU-02 acceptance behavior:
- An active coach can browse and search the shared catalog and their gym library, and filter by focus, muscle, equipment, and difficulty.
- The shared catalog is visibly identified as shared/read-only; direct create/update/archive of global source records is denied server-side, not merely hidden in UI. Copying a source into the current gym is allowed and creates a tenant-owned record.
- An active coach can create an exercise in the current gym, edit it, archive it, and restore it only if restoration is part of the UI; errors and confirmation states are explicit.
- Copying a shared exercise creates a separately owned gym record with copied fields and source provenance; edits do not change the source or another gym's data.
- Coaches in another gym, members, inactive profiles, and users of suspended tenants cannot read/manage tenant-owned library records outside their allowed scope or perform writes. RLS tests cover allowed and denied reads/writes for each actor and tenant boundary.
- Reapplying seed data is idempotent and does not overwrite curator edits; production personal data and Auth identities are never seeded.
- A deleted/archived exercise cannot be newly selected for a routine, while existing assignment snapshots/history continue rendering intact.
- Database, permission, and validation failures remain visible; never disguise them with demo records.

Mocks remain for isolated tests or an explicitly designed demo flow only; persisted features use their typed repository as the single source and never merge or fall back to fixtures. CU-02 and the currently deployed date-bound CU-03 assignments are Supabase-backed migration sources. The target flexible CU-03 model replaces that workflow after assignment/snapshot migration; CU-04 execution and CU-04B biometrics/history are not yet persisted. Student-facing progress must remain an empty state until backed by real records.

Exercise catalog records are original AGS-authored content with stable IDs. Production catalog entries are added through reviewed idempotent migrations. `supabase/seed.sql` is local-only and also creates development tenants; never execute it against Production. Do not seed fake `auth.users` or personal data; create local test accounts through development-only scripts.

### Capacity Terms

- `tenants.max_clients` is a retained gym-level setting, not a class-seat limit. The current personalized invitation, acceptance, and reactivation flows do not enforce it and do not reserve membership places. Do not introduce such checks without a new product decision. Any future gym-wide member limit requires its own definition; per-class capacity remains separate and deferred to CU-10.
- CU-01B invitations add a member to the gym and grant application access; they are not group-class bookings. Invitation-link expiry controls account setup only; an accepted member remains active until the coach-admin changes the profile to `INACTIVE`. Personalized programming is coach-authored. The target CU-03 offers a dated single-day mode and a cycle mode with ordinal cycle-day routine slots; cycle-day slots are not calendar assignments or class bookings.
- Group-class capacity is a separate per-class value, deferred to CU-10. When implemented, each class must have capacity of at least 1; do not reuse `tenants.max_clients` for class attendance.

## Local Authentication Note

With the current local configuration, `localhost` resolves to the default tenant (`VITE_DEFAULT_TENANT_SUBDOMAIN=ags`). A tenant-less `super_admin` session therefore cannot be exercised there; validate its platform placeholder only in a platform-host context that resolves no tenant. Production domain/DNS and auth configuration remain pending.

For temporary Vercel Preview testing before a custom domain exists, `VITE_PREVIEW_TENANT_HOSTNAME` may map one exact preview hostname (currently `ags-roan-iota.vercel.app`) to the configured default tenant. Set it only in Vercel's Preview environment. Production tenant routing remains subdomain-based (`ags.tugimnasioapp.com`) and must not use a broad `vercel.app` wildcard.

## Product Invariants

1. Every tenant-owned record carries or resolves a `tenantId`.
2. Tenant scope, actor role, profile status, and tenant status apply to protected features.
3. Client-side role switching is demo tooling, never authorization.
4. Routine definitions/versions are scoped to tenant and programming plan; a cycle contains N ordered cycle-day slots, not calendar dates. Student executions are scoped to the student, selected plan/slot, cycle iteration when applicable, and actual execution date. Existing date-bound records must be migrated into the unified `SINGLE_DAY`/`CYCLE` model, not retained as a parallel workflow.
5. `SUSPENDED` tenants and `INACTIVE` profiles are blocked even with cached sessions.
6. Draft, published, offline, failed, and synchronized states are distinct.
7. Target load, actual load, RPE, completion, and historical records are distinct concepts.
8. Feature flags affect visibility, but backend authorization still enforces access.
9. Personalized training is the first business workflow to make real; group-class capacity, scheduling, and booking are explicitly deferred.
10. Personalized routine programming is coach-assigned; there is no user-facing class booking/reservation in CU-01B through CU-04.

## Future Domain Entities

```text
Tenant
Profile/User
Invitation
MemberServiceAccess (personalized and/or group classes)
Exercise
RoutineTemplate
RoutineTemplateItem
RoutineAssignment
RoutineAssignmentItem
TrainingCycle
CycleRoutine
CycleRoutineItem
RoutineExecution
ExerciseCompletionCheck
WorkoutSession
SetLog
ProgressRecord
FeatureFlags
GroupClass (deferred)
ClassBooking (deferred)
```
