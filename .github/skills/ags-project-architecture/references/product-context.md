# AGS Product Context

## Product

AGS GluteHouse is a multi-tenant fitness SaaS under active development. This reference defines intended behavior, actors, priorities, and product decisions. `project-status.md` is a concise handoff for current focus and verified release evidence; GitHub, Supabase, and Vercel remain the sources of truth for live implementation/deployment state. CU-04B biometrics and CU-04C coach workout review remain planned unless verified in the live implementation.

## Actors

- `super_admin`: manages gyms, plans, capacity, feature flags, themes, billing state, and suspension.
- `coach_admin`: invites members to the gym by email, manages tenant-owned exercises, and assigns personalized routines to the members they coach.
- `user_personalized`: gym member with personalized service access; views a single-day program or cycle routines, chooses a cycle-day routine to execute on actual calendar dates, tracks exercise completion/training data, and views progress. The same account may also have group-class access.
- `user_general`: group-only gym member when CU-10 is implemented; discovers and books group classes, without a personalized program unless personalized access is also granted.
- Unauthenticated visitor: resolves the gym and theme before login.

## Use-Case Map And Priority

| Case | Intended behavior |
|---|---|
| CU-00 | Detect tenant by subdomain, load theme, handle unknown/suspended tenant |
| CU-01 | Authenticate, validate profile/tenant, and route by role |
| CU-01A (recovery flow in Production; metadata sync pending) | A known account holder requests password recovery by email and sets a new password through a short-lived, single-use, allowlisted recovery link. |
| CU-01A (implemented in Production) | A known account holder requests password recovery by email and sets a new password through a short-lived, single-use, allowlisted recovery link. |
| CU-01B | Coach invites a member to the gym; onboarding grants personalized access. Personalized membership does not enforce `tenants.max_clients`. |
| CU-02 | Browse the shared immutable exercise catalog and manage an independent gym-owned exercise library. |
| CU-02B | Create reusable routine templates and reorder items. |
| CU-03 | Coach programs a dated routine or a cycle of N ordinal slots; student chooses cycle slots on actual dates. |
| CU-04 | Student records exercise completion and actual reps/load plus RIR/RPE; student reviews personal workout progress; offline sync is deferred. |
| CU-04B | Coach records dated body measurements; student sees longitudinal training and biometric progress. Define the metric catalogue/units before implementation. |
| CU-04C | The coach who owns a published routine reviews that assigned student's workout history, derived completion percentages, and per-exercise actual performance. The student is told this information is visible to that coach. Coach and student can exchange plain-text comments on that exact registered workout, with no second copy or modification of workout data. Read-only for workout values. |
| CU-05 | Exercise detail, inline video, rest timer, sound/vibration alert. |
| CU-06 | Direct contact with coach. |
| CU-07 | Super-admin gym, plan, theme, subscription, membership administration, and tenant-specific catalog options. |
| CU-08 | Feature flags by gym and plan. |
| CU-09 | Suspend/reactivate gym access. |
| CU-10 (proposed) | Group-class schedules, per-class capacity, booking, attendance, and `user_general` access; deferred after the personalized-training MVP. |

### Personalized-Training MVP Order

1. CU-01B: the coach enters an invitee's email in the tenant UI; the invitee receives an email, accepts it, and completes account setup. A trusted server-side flow validates the active coach and tenant, creates the invitation/account/profile, and assigns `user_personalized` and `tenant_id`; the browser never chooses either value. Public self-signup remains disabled.
2. CU-02: provide two sources in one coach-facing library: a curated cross-tenant catalog that authenticated users can read but cannot edit, and tenant-owned exercises that authorized coaches can create, read, update, and archive. A coach may copy a shared exercise into their gym as a starting point; the copy is independently editable and never changes the shared source or another gym's copy. Seed stable-ID, original AGS-authored exercise records idempotently after schema/RLS exists. Production catalog records use reviewed migrations; `supabase/seed.sql` is local-only and also creates development tenants.
3. Migrate CU-03 to one unified programming model with two explicit modes. In `SINGLE_DAY`, the coach selects one calendar date and programs one routine for it. In `CYCLE`, the coach chooses a positive number N of cycle-day slots and programs one routine for each ordinal slot (Day 1..N), with independent per-exercise integer rep/load progression. These cycle-day numbers are plan positions, not weekday labels or calendar dates. The authored cycle is its first iteration; the coach's additional-repeat count adds further iterations (total iterations = 1 + additional repeats). Progression for each exercise compounds from its target in the preceding iteration of the same cycle slot, preserving `lbs` or `kg`. If a published `SINGLE_DAY` routine exists for a student on the selected calendar date, it takes precedence: show that routine and do not allow starting a `CYCLE` routine that date.
	Migrate current date-bound assignments and immutable snapshots into the unified model before cutover. Match the student screen hierarchy: calendar/week selector, “Lo que ya hiciste hoy” activity list, then “Escoge tu siguiente entrenamiento”. In cycle mode, cycle routines are available choices independent of actual calendar date; the calendar records execution dates but does not dictate cycle slot. Slots may be chosen in any order within a global iteration, and the next iteration opens only after every slot has a completed or closed-incomplete execution. Incomplete attempts consume that slot's attempt without advancing its progression; only completed executions advance progression. Exhausted slots remain unavailable while other slots may continue. The student may start at most one routine per actual calendar date, may resume it only that day, and at day end incomplete progress freezes and closes without resume/edit; a new routine can be started the following date. A different same-day start shows: “Ya tienes una rutina en curso o terminada hoy. Continúa esa rutina o vuelve mañana para iniciar otra.” Registering an exercise marks it complete; no separate completion checkbox is shown. Completed routines remain viewable for history. Retire the old implementation in favor of the unified model after migration.
	After publication, the coach may edit a scheduled routine or cycle slot only while that specific training has no execution record. Any slot with an `IN_PROGRESS`, `COMPLETED`, or `CLOSED_INCOMPLETE` execution is immutable; its prescription and all recorded student values remain as originally shown. Other cycle slots with no execution may still be edited. Once any slot in a cycle has an execution, cycle-wide structure (slot count and additional repeats) cannot change, so the active round and progression rules stay stable. Changes apply only to future starts of untouched training; tell the coach which scope is locked and confirm that edits affect only unstarted training. Do not silently rewrite an execution snapshot or alter cycle progression/history.
4. Extend CU-04 from published-routine reading to execution records: student logs whole-number actual reps/load and one completion flag per exercise, regardless of the number of prescribed sets, plus one RIR value (1-10) and one RPE value (0-100%) per exercise. Present RIR and RPE as separate slider-style bars with visible minimum/maximum and current value; constrain selection to each range and reject out-of-range values. Preserve prescription and actual values separately. Offline synchronization remains deferred and must be specified separately.
5. Add CU-04C coach review of execution progress after CU-04 persistence: the coach who authored the published assignment can open that student's detail, scan dated workouts with status and derived completion percentage, and inspect a workout's prescribed target beside the student's actual reps, load/unit, RIR, RPE, and completion for each exercise. Use a dated list plus a selected-workout detail first; defer charts, exports, rankings, and trend claims. Tell the student in the logging flow that the coach assigned to the routine can review these records. Workout values remain read-only for the coach. Add a bidirectional plain-text comment thread attached to the exact `routine_executions` record: the assigned coach and the owning student may read and create comments for that registered workout, but neither may modify another author's comment or alter workout values. Comments are tenant-scoped and preserve chronological attribution. Show incomplete/closed workouts truthfully and preserve the student's history. Only the active coach authorized for that exact student and assignment in the same active tenant may read it; the student continues to read only their own. Do not expose another coach's assignment history merely because both coaches share a tenant.
6. Add CU-04B coach-authored dated biometric records and student-only history/profile visualization alongside persisted workout progress. The biometric form and metric catalogue are pending client definition; do not invent the measurement list or display mock data as recorded values.

The target personalized acceptance path is invite email -> account activation -> coach plans/publishes a cycle -> student records performed training -> coach reviews that assignment's workout progress -> coach records biometrics -> student reviews personal progress. Each step must preserve tenant, coach, and student ownership. Do not start group-class scheduling, booking, or attendance as part of this MVP.

### Decisions To Close Before Schema/Implementation

- A routine starts only when the student uses “Registrar ejercicio” with valid actual reps/load and effort for an exercise. Opening the individual training screen or editing a draft does not create an execution or consume the daily allowance. That registration action records the exercise as completed. Progress is completed exercises divided by prescribed exercises, with one actual reps/load entry per exercise. Resume is restricted to the same date; at day end, an incomplete workout closes and its results can be reviewed but not changed. A new date permits another routine start.
- Any RIR/RPE scale labels or interpretation beyond the confirmed numeric ranges remain to be confirmed; do not infer a conversion between the scales.
- Define the pending biometric registration form: metric catalogue, units, optionality, edit/correction policy, and whether the student sees every metric or coach-selected metrics.
- Define tenant-specific available equipment options for CU-02. The super-admin manages the tenant list; coaches select options when creating or editing an exercise. Do not model machine inventory, brand/model, composition, serial number, maintenance inspection, or per-exercise safety checklists. The option catalogue must remain tenant-isolated and backward-compatible with existing shared and tenant exercise records.
- Decide if biometrics and workout progress are charts, dated tables, or both, and define empty states and privacy/access rules. Do not infer metrics from mock/profile placeholders.

### Password Recovery Status

- **CU-01A: Self-service password recovery.** The login flow, `PASSWORD_RECOVERY` session handling, and reset-email template are deployed to Production; Auth redirect allowlist, minimum 10-character password, and recovery subject/body were pushed to Supabase. Migration 038 backfilled tenant branding to existing Auth users and synchronizes it when tenant theme/profile changes; a read-only Production aggregate confirms `gym_logo_url` metadata for all 5 AGS accounts. Migration 037 retires the custom loading-icon feature, and both follow-up migrations are applied in Production.
- **Flow:** from the tenant-branded login, accept an email and call Supabase Auth `resetPasswordForEmail` with a fixed, same-origin callback. Show the same neutral confirmation whether or not an account exists. After the trusted recovery event is recognized, allow a new password through `updateUser({ password })`; on success, sign out and return to sign-in. Do not create accounts or bypass `enable_signup = false`.
- **Security/configuration:** Production Auth enforces a 10-character minimum and allows the current Production alias plus the owned tenant-subdomain pattern; local development keeps its own localhost allowlist. Never accept an arbitrary `next`/redirect URL. Keep the public/publishable key in the browser and do not add a service-role function for this standard Auth operation. Preserve single-use/expiry behavior and verify production email rate limits; add Supabase CAPTCHA protection if abuse risk or delivery volume warrants it. Consider a password-changed security notification. Keep invitation acceptance separate and unchanged.
- **Acceptance criteria:** login offers “Olvidé mi contraseña”; request confirmation does not disclose whether the email is registered; valid recovery links reach a password-update screen instead of the normal role-routed app; expired, invalid, reused, and wrong-origin links cannot change a password; submitted passwords are validated and saved through the recovery session; success returns safely to sign-in; signup remains disabled; the gym's tenant branding is retained.
- **Tests:** unit tests cover generic request errors, fixed same-origin callback, password update and hidden backend errors; local end-to-end testing covers the successful recovery and sign-in path plus expired/reused links. Pending migration 038 adds tenant logo metadata synchronization; verify it in local pgTAP and preserve the existing no-real-email testing rule.
- **Tests:** unit tests cover generic request errors, fixed same-origin callback, password update and hidden backend errors; local end-to-end testing covers the successful recovery and sign-in path plus expired/reused links. Local pgTAP verifies logo metadata backfill, future sync and unrelated metadata preservation; no Production recovery email was sent for testing.
- **References:** [Supabase password-based Auth and reset flow](https://supabase.com/docs/guides/auth/passwords), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits), and [Auth CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha).

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

Mocks remain for isolated tests or an explicitly designed demo flow only; persisted features use their typed repository as the single source and never merge or fall back to fixtures. Student-facing progress must remain an empty state until backed by real records. Consult `project-status.md` for current release evidence.

Exercise catalog records are original AGS-authored content with stable IDs. Production catalog entries are added through reviewed idempotent migrations. `supabase/seed.sql` is local-only and also creates development tenants; never execute it against Production. Do not seed fake `auth.users` or personal data; create local test accounts through development-only scripts.

### Capacity Terms

- `tenants.max_clients` is a retained gym-level setting, not a class-seat limit. The current personalized invitation, acceptance, and reactivation flows do not enforce it and do not reserve membership places. Do not introduce such checks without a new product decision. Any future gym-wide member limit requires its own definition; per-class capacity remains separate and deferred to CU-10.
- CU-01B invitations add a member to the gym and grant application access; they are not group-class bookings. Invitation-link expiry controls account setup only; an accepted member remains active until the coach-admin changes the profile to `INACTIVE`. Personalized programming is coach-authored. The target CU-03 offers a dated single-day mode and a cycle mode with ordinal cycle-day routine slots; cycle-day slots are not calendar assignments or class bookings.
- Group-class capacity is a separate per-class value, deferred to CU-10. When implemented, each class must have capacity of at least 1; do not reuse `tenants.max_clients` for class attendance.

## Local Authentication Note

With the current local configuration, `localhost` resolves to the default tenant (`VITE_DEFAULT_TENANT_SUBDOMAIN=ags`). A tenant-less `super_admin` session therefore cannot be exercised there; validate its platform placeholder only in a platform-host context that resolves no tenant. Consult `project-status.md` for current production domain/DNS state.

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
