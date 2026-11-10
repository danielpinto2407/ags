# AGS Product Context

## Product

AGS GluteHouse is intended to become a multi-tenant fitness SaaS. The current application is a React/Vite local prototype; the use cases are the source of truth for product behavior.

## Actors

- `super_admin`: manages gyms, plans, capacity, feature flags, themes, billing state, and suspension.
- `coach_admin`: invites members to the gym by email, manages tenant-owned exercises, and assigns personalized routines to the members they coach.
- `user_personalized`: gym member with personalized service access; views published routines assigned to their account, records exercise completion and training data, and views progress. The same account may also have group-class access.
- `user_general`: group-only gym member when CU-10 is implemented; discovers and books group classes, without a personalized program unless personalized access is also granted.
- Unauthenticated visitor: resolves the gym and theme before login.

## Use-Case Map And Priority

| Case | Behavior | Status |
|---|---|---|
| CU-00 | Detect tenant by subdomain, load theme, handle unknown/suspended tenant | local slice implemented; production domain/DNS pending |
| CU-01 | Authenticate, validate profile/tenant, redirect by role | local password sign-in/session/profile slice implemented; provisioning and remote deployment pending |
| CU-01B | Coach invites one member to the gym by email; onboarding can grant personalized access, group-class access, or both, under one account and the gym member limit | partial: personalized local send/accept/password flow works end to end; cancellation, inactivation, and group entitlement pending |
| CU-02 | Create and manage tenant-owned exercises with their complete instructional and media details, including video reference, and coach author | local UI only; needed for real assignments |
| CU-02B | Create reusable routine templates and reorder items | planned; optional after direct personalized assignment works |
| CU-03 | Assign a personalized routine to one user by date/day slot; save as draft and publish to that user | partial local UI; MVP priority |
| CU-04 | User views their published routine, executes it, checks off exercises, and records completion and actual training data | partial UI; MVP priority; offline sync deferred |
| CU-04B | Derive training history, progression, and personal records from persisted workout logs | planned after CU-04 persistence |
| CU-05 | Exercise detail, video, rest timer, sound/vibration alert | partial UI; supporting experience after the core cycle |
| CU-06 | Direct WhatsApp contact with coach | placeholder; supporting experience |
| CU-07 | Super-admin gym, plan, member limit, theme, and subscription management | planned |
| CU-08 | Feature flags by gym and plan | planned |
| CU-09 | Suspend/reactivate gym access | planned |
| CU-10 (proposed) | Group classes: schedules, per-class capacity, booking, attendance, and `user_general` access | deferred until after the personalized-training MVP |

### Personalized-Training MVP Order

1. CU-01B: the coach enters an invitee's email in the tenant UI; the invitee receives an email, accepts it, and completes account setup. A trusted server-side flow validates the active coach and tenant, creates the invitation/account/profile, and assigns `user_personalized` and `tenant_id`; the browser never chooses either value. Public self-signup remains disabled.
2. CU-02: provide tenant-owned exercises that can be used in a prescription. Existing exercise-library UI and fixtures are not persisted tenant data.
3. CU-03: let the coach assign a routine to a specific personalized user and date/day slot, with draft/published state. Templates are not a prerequisite for the first usable assignment.
4. CU-04: let the user see only their own published assignments, execute them, check off exercises, and persist completion and set-level actual values. Offline synchronization is not required for this first online cycle and must be specified separately before implementation.
5. CU-04B: build history and progress from persisted workout sessions, not independent mock totals.

The current acceptance path is personalized invite email -> account activation -> coach assigns and publishes a personalized routine -> student signs in and executes/checks off that routine. Each step must preserve tenant and user ownership. Do not start group-class scheduling, booking, or attendance as part of this MVP.

### Invited Member Experience


## Recommended Global Sender Decision for Production

Use one platform-controlled transactional sender for all gyms, for example `AGS GluteHouse <invitaciones@auth.tugimnasioapp.com>` once ownership of that domain is confirmed and SPF, DKIM, and DMARC are configured. Invitation subject/body should clearly show the gym name and coach who invited the member. Use a gym/coach `Reply-To` only after a trusted contact email is part of the server-side profile contract. Coaches must not supply arbitrary From addresses. This keeps domain verification, reputation, credentials, bounce handling, and templates under platform control while preserving each gym's identity in the message.

Per-gym From addresses are deferred. They require each gym to prove domain ownership and configure sender authentication; do not offer them as a simple coach setting. If later required, implement a verified tenant sender-domain onboarding flow with server-side credentials and delivery monitoring.

## Local Gmail SMTP for Testing

The Gmail SMTP helper is a local delivery test only. It sends from the developer's Gmail account to a recipient entered in the invitation form; it does not imply per-gym senders or define the production From identity. Use a Google App Password (never the normal Gmail password) and remove/revoke it after testing if no longer needed. Production Auth email must use the platform-controlled transactional sender above.
## Exercise And Mock-Data Preservation

The current `Exercise` contract includes `id`, `name`, `series`, `reps`, `weight`, optional `workDuration`, `rest`, `emoji`, `muscles`, `instructions`, `tips`, `difficulty`, and optional `videoUrl`. Preserve every field when moving an exercise from the coach library into an assignment and then into the student's routine/detail view. Assignment-specific prescription values may override defaults, but must not mutate the catalog exercise or discard its instructional/media fields. A published assignment must retain the exact exercise details and video reference used when it was published, through an immutable version or an equivalent snapshot. `videoUrl` is currently optional; retain that contract and define a clear no-video UI state unless a later product decision makes video mandatory.

Mocks remain useful for isolated UI/unit tests and an explicit demo mode while the real data path is built. Supabase local is the integration environment for persisted tenant-owned exercises, invitations, routine assignments, and workout logs. Select one source explicitly per run (for example `mock` or `supabase`); never silently merge mock records into database results or fall back to mocks after a database error. Promote each use case to Supabase only after its schema, RLS, repository adapter, seed/test data, and user flow are verified. Remove mock dependencies feature by feature after parity, not in a single risky rewrite.

Seed safe, stable-ID sample exercises idempotently after the exercise schema exists, preserving every field and video reference. These are demo fixtures persisted in the local database, not real user-generated data. Do not seed fake `auth.users` or real people's personal data in SQL. Local coach/student accounts must be created with development-only provisioning scripts; seed or create user-owned assignments only after those Auth identities exist.

### Capacity Terms

- `tenants.max_clients` is the maximum number of unique member accounts allowed for a gym, not the capacity of an individual class. It must be an integer of at least 1; zero is invalid. A member with both services counts once, not once per service. CU-01B currently supports only personalized profiles; when group members are introduced, count all active unique members and pending unique invitations. Migration 003 repairs/enforces the minimum; never rewrite applied migrations.
- CU-01B invitations add a member to the gym and grant application access; they are not group-class bookings. A pending invitation occupies one gym membership place while the account is being provisioned; once accepted, the active profile is the source of truth and remains registered until the coach-admin changes it to `INACTIVE`. Expiration of an email link does not expire an already-linked account or release its place; the coach can resend access. An unlinked/failed invitation that expires or is cancelled can release its temporary onboarding allocation.
- Count active unique gym members plus pending unique onboarding invitations atomically under a tenant lock. Service entitlements do not multiply member capacity. On acceptance, transition the pending invitation to an active profile in one transaction so the same member is counted once. A coach-programmed personalized routine is assigned to the user by date/day; the user completes that programming and does not book or reserve a class slot.
- Group-class capacity is a separate per-class value, deferred to CU-10. When implemented, each class must have capacity of at least 1; do not reuse `tenants.max_clients` for class attendance.

## Local Authentication Note

With the current local configuration, `localhost` resolves to the default tenant (`VITE_DEFAULT_TENANT_SUBDOMAIN=ags`). A tenant-less `super_admin` session therefore cannot be exercised there; validate its platform placeholder only in a platform-host context that resolves no tenant. Production domain/DNS and auth configuration remain pending.

For temporary Vercel Preview testing before a custom domain exists, `VITE_PREVIEW_TENANT_HOSTNAME` may map one exact preview hostname (currently `ags-roan-iota.vercel.app`) to the configured default tenant. Set it only in Vercel's Preview environment. Production tenant routing remains subdomain-based (`ags.tugimnasioapp.com`) and must not use a broad `vercel.app` wildcard.

## Product Invariants

1. Every tenant-owned record carries or resolves a `tenantId`.
2. Tenant scope, actor role, profile status, and tenant status apply to protected features.
3. Client-side role switching is demo tooling, never authorization.
4. Routines are scoped to tenant, student, and date/day slot.
5. Personalized membership capacity is checked during invitation onboarding and account acceptance. An accepted active profile counts until the coach-admin disables it; invite-link expiry is not membership expiry.
6. `SUSPENDED` tenants and `INACTIVE` profiles are blocked even with cached sessions.
7. Draft, published, offline, failed, and synchronized states are distinct.
8. Target load, actual load, RPE, completion, and historical records are distinct concepts.
9. Feature flags affect visibility, but backend authorization still enforces access.
10. Personalized training is the first business workflow to make real; group-class capacity, scheduling, and booking are explicitly deferred.
11. Personalized routine programming is coach-assigned; there is no user-facing class booking/reservation in CU-01B through CU-04.

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
WorkoutSession
SetLog
ProgressRecord
FeatureFlags
GroupClass (deferred)
ClassBooking (deferred)
```
