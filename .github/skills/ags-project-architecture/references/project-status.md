# AGS GluteHouse Project Status

Last reviewed: 2026-11-10

This is the living implementation snapshot. Product invariants and detailed architecture rules remain in the linked skill references; update this file whenever code, schema, tests, configuration, or project documentation changes.

## Current Snapshot

- Branch: `develop`.
- Last committed implementation baseline: `48cb974` (`feat(auth): add CU-01 session, profile access and login flow`).
- Last committed checkpoint: `752178e` (`feat(auth): improve personalized invite email`) on `develop`. Vercel Production's `VITE_PREVIEW_TENANT_HOSTNAME` was corrected in the dashboard to `ags-roan-iota.vercel.app`, then Production was redeployed from `main` commit `e51a209`; this external Vercel setting is not stored in Git.
- The Spanish invite subject/body are active in Supabase Production and their matching source template/config are maintained in this repo. SMTP credentials remain managed only in the Supabase dashboard, never in Git.
- Stack: React 18, Vite 5, TypeScript, Tailwind 3, Supabase JS/CLI.
- Local Supabase persists tenant/profile foundation plus CU-01B onboarding. Applied migrations are `001_create_tenants_and_profiles.sql` through `005_fail_unlinked_personalized_invitation.sql`; pgTAP covers tenant/profile RLS, capacity, acceptance, and failed onboarding cleanup.
- `.env.local` is local-only and ignored. Hosted Supabase project `ags` (`vmrcwizgluzvsmmkkhnt`, `us-east-1`, PostgreSQL 17) is linked to this repo. Migrations 001-005 and the active AGS tenant (`max_clients=100`) are provisioned. Hosted Auth public signups are disabled, the Site URL is `https://ags-roan-iota.vercel.app`, and its exact-host wildcard redirect is allowlisted. Both invitation Edge Functions are deployed with JWT verification enabled; their redirect and CORS origins are configured as Supabase secrets. Both functions allow `authorization`, `apikey`, `x-client-info`, and `content-type`; Production preflights return 204 for the exact app origin. Anonymous invite POST returns 401. The confirmed `Agsglutehouse@gmail.com` Auth user has an ACTIVE `coach_admin` profile in tenant `ags` in both local and hosted projects. User confirmed a real Gmail invitation was delivered and the invitee entered the app through its email link. Production Auth SMTP uses the personal Gmail sender `managedtrainingapp@gmail.com` over `smtp.gmail.com:465`; Supabase warns that a personal-mail provider may hurt deliverability. The Production Invite user template is customized in Spanish; the matching local template is configured at `supabase/templates/invite.html` and takes effect after restarting local Supabase. Supabase local is running.
- Preview hostname `ags-roan-iota.vercel.app` maps to tenant `ags` only when explicitly set as `VITE_PREVIEW_TENANT_HOSTNAME`; use the exact hostname only in Vercel Preview/temporary test environments. Production should use `ags.tugimnasioapp.com` after DNS/domain setup.
- Vercel Production was verified after the hostname fix. After remote migrations 001-005 and the active AGS tenant (`max_clients=100`) were provisioned, reloading `ags-roan-iota.vercel.app` reached the GluteHouse login screen, confirming the app can resolve hosted tenant configuration. Auth redirects now allow the test alias; production custom domain remains pending.
- Local SMTP remains on Mailpit. The hosted personal Gmail SMTP successfully delivered the test invitation, but Supabase flags personal providers as a deliverability risk. A polished, concise authentication template improves clarity but cannot guarantee inbox placement. For stronger spam mitigation, use a transactional sender with an owned sending domain and publish the provider's SPF/DKIM records plus DMARC; keep one consistent From identity and send only expected invitations. Production decision: one platform-controlled, authenticated sender for all gyms; a personal Gmail account is test-only.

## Use-Case Status

| Case | Current status | Remaining work / next dependency |
|---|---|---|
| CU-00 Tenant resolution and theme | Local slice implemented; exact-host Vercel preview override deployed; hosted schema/RPC and AGS tenant provisioned | Configure production DNS/root-domain/platform host |
| CU-01 Authentication and profile access | Local and hosted coach identities exist; active coach_admin profile verified in tenant AGS in both environments; user confirmed Production login works | Configure SMTP for external Gmail invitations |
| CU-01B Coach invitation and personalized-user onboarding | Partial: migrations 003-005, trusted Edge Functions, coach invite UI, invitee acceptance/password setup, localized invite template, and hosted Gmail delivery/link entry verified by user with a real email; complete local browser flow verified | Re-test the newly updated template end to end; define onboarding for a previously registered Auth identity; use a transactional sender/domain authentication for improved deliverability; cancellation/inactivation workflow, failure-path HTTP integration test, concurrency integration test, and replace post-login student mock programming |
| CU-02 Exercise library | UI and fixtures only; not persisted | Tenant-owned schema/RLS/repository/local seed; complete create/edit form and validated video reference |
| CU-02B Routine templates | Planned, optional for first personalized workflow | Defer until direct assignment needs are proven |
| CU-03 Personalized routine assignment/publication | Prototype only | Tenant/student/date assignment model, draft/publish, full exercise snapshot, ownership policies |
| CU-04 Workout execution/check-off | Prototype only | Student sees own published work; persist session, completion, and actual set data |
| CU-04B History/progression | Planned | Derive from persisted workout logs after CU-04 |
| CU-05 Exercise detail/video/timer | Partial UI | Integrate validated video playback and persisted assignment details |
| CU-06 Coach contact | Placeholder | Real contact details/action when product flow is defined |
| CU-07 Tenant administration | Planned | Super-admin operations |
| CU-08 Tenant feature flags | Schema hints exist; enforcement/admin incomplete | Server-side authorization and management |
| CU-09 Tenant suspension/reactivation | RLS blocks suspended tenants; admin workflow not implemented | Trusted lifecycle/admin UI and integration tests |
| CU-10 Group classes | Proposed and deferred | Schedule, capacity (minimum 1), booking, attendance, `user_general` |

## Verified Product And Data Decisions

- The first complete product path is: coach invites by email -> invitee activates account -> coach assigns and publishes a personalized routine -> student signs in and completes it.
- Personalized training precedes group classes. Group-class scheduling, booking, attendance, and per-class capacity are out of scope until the personalized MVP is complete.
- `tenants.max_clients` is the gym-wide member limit, not per-class capacity, and must be >= 1. Migration 003 enforces it. The current capacity RPC counts personalized profiles only; extend it to all active member tracks before group-only accounts are introduced.
- CU-01B email invitations are onboarding to a persistent gym membership, not reservations for classes. Personalized training is programmed by the coach for the user; group-class booking remains deferred.
- Current invitation onboarding supports only the personalized service track. Product decision: one member may have personalized access, group-class access, or both under one Auth identity; when both are active, published personalized programming is primary and group classes are a separate destination.
- Migrations 003/004 do not persist selected service access and acceptance always creates `user_personalized`; do not present group-only or dual invitations as supported yet. Before CU-10, add server-side service entitlements, explicit responsible-coach assignment, and capacity counting by unique member rather than by entitlement. The current capacity function counts personalized profiles only.
- `supabase/functions/invite-personalized-member/index.ts` verifies the bearer session, derives the active coach and tenant from `profiles`, calls the service-only prepare RPC, sends Auth invite/recovery email, links newly invited Auth identities, and marks an unlinked invitation failed if Auth did not create an identity. Local HTTP checks returned `sent`, then `resent`, kept one pending invitation, captured both emails in Mailpit, and rejected a request without a session with 401. Temporary coach/invitee records and only their Mailpit messages were removed.
- `supabase/functions/accept-personalized-invitation/index.ts` validates the signed-in invitee and delegates atomic profile activation to the acceptance RPC. Coach UI invokes the invite endpoint; the email destination opens the invitee completion screen, which verifies the email-backed session, sets a password (minimum 10 characters), submits full name, accepts the invitation, removes the invitation query parameter, and reloads the active profile. Browser verification confirmed the member could sign out and sign back in with the new password. Demo student routines, metrics, and coach details remain mock data; a newly invited member must not mistake them for assigned/persisted programming, and CU-03/CU-04 should replace them with a truthful no-programming state and real data.
- Existing active personalized members are intentionally rejected as duplicate invitations (`member_already_exists`); an unexpired pending invitation is reused. A previously registered Auth identity without an AGS member profile is not yet supported as a membership-attachment flow and may be rejected by Supabase Auth's invite API. This is a known onboarding limitation, not a way to create a duplicate identity; design an explicit secure attachment flow before claiming existing-account invitations are supported.
- Implemented in migrations 003/004: the tenant row is locked during capacity checks; same-tenant pending invitations are reused; unlinked expired onboarding can release its temporary allocation; Auth-linked pending invitations remain counted after invite-link expiry; acceptance atomically creates the active profile and marks the invitation accepted. The active profile remains counted until the coach-admin inactivates it. Inactive profiles do not consume capacity.
- Public self-signup stays disabled. A browser must never choose its role or `tenant_id`, and service-role credentials must never reach Vite/client code.
- The full Exercise contract is: `id`, `name`, `series`, `reps`, `weight`, optional `workDuration`, `rest`, `emoji`, `muscles`, `instructions`, `tips`, `difficulty`, optional `videoUrl`. Preserve every field through library -> assignment snapshot -> student execution. Keep assignment overrides separate from catalog defaults. Video is optional today; validate its reference and show an explicit no-video state.
- Existing business screens use mocks. `fitnessRepository.getExercises()` returns fixtures; exercise creation only updates screen state. Routine editing uses one global localStorage `RoutineMap`; it is not student-scoped. Student check-offs are in component state and are not persisted.
- Keep an explicit `mock` or `supabase` data mode behind typed repositories. Do not mix sources or silently fall back to mocks on database errors. Mocks remain useful for tests/demo while each vertical slice is moved and verified against local Supabase.
- Local catalog seeds may persist stable-ID demonstration exercises idempotently after schema/RLS is ready. They are demo fixtures, not real user data. Do not seed fake Auth users or personal data in SQL; provision local identities with development-only scripts.
- Existing samples use generic YouTube URLs; do not present them as valid instructional videos. Decide approved external HTTPS URLs versus Supabase Storage when implementing CU-02, then validate/play the chosen format.
- Templates are optional for the first direct student/date assignment. Offline sync is deferred; the first execution flow is online and persists workout/session data.
- Current localhost defaults to tenant `ags`, so it cannot exercise a tenant-less `super_admin` platform context without a separate host setup.
- Vercel configuration uses `VITE_SUPABASE_URL=https://vmrcwizgluzvsmmkkhnt.supabase.co`, the project's publishable/anon key, `VITE_ROOT_DOMAIN=tugimnasioapp.com`, `VITE_DEFAULT_TENANT_SUBDOMAIN=ags`, and `VITE_PREVIEW_TENANT_HOSTNAME=ags-roan-iota.vercel.app`. Do not place service-role or secret keys in Vercel frontend variables. Hosted schema, tenant, coach profile, Auth redirect, and invitation functions are configured; real invitation delivery still needs custom SMTP.

## Immediate Next Work

1. Re-test the updated Spanish template end to end and inspect Gmail headers/Spam status; verify the accepted member profile and password sign-in.
2. Design a secure invitation path for existing Auth identities without an AGS member profile; retain the duplicate-member rejection.
3. Move from personal Gmail SMTP to a transactional provider on an owned sending domain and configure SPF, DKIM, and DMARC to improve deliverability; never place provider credentials in chat or Vite.
4. Replace the mock student-member list in the coach workflow with a tenant-scoped repository, so invited members become visible from persisted profiles rather than fixtures.
5. Implement coach-managed member inactivation and invitation cancellation/status viewing; add HTTP integration coverage for delivery failure and concurrency at the final member place.
6. Implement CU-02 exercise persistence, then CU-03 per-member assignments/publication and CU-04 execution. Until that data path exists, show a truthful no-programming state for new members instead of mock routines/metrics. Continue to CU-04B history from persisted workout logs and keep CU-10 deferred.

Open implementation decisions before CU-10: lifecycle for disabling one service versus the whole member account, and the exact `member_service_access` schema/RLS. The product decision is that dual access is allowed and each unique member consumes one `max_clients` place.

## Validation And Local Workflow

- Latest validation: `npx supabase test db` passed 58/58; `npm test` passed 30/30; lint, typecheck, and build passed. Local Edge Functions compiled. Browser E2E: coach sent invitation, invitee signed in, completed profile and set password, reached student app, signed out and signed in again with that password. Temporary users/invitation were deleted. Existing warnings: TypeScript version is beyond the current typescript-eslint support range; Vite/esbuild deprecation and Browserslist database warnings remain.
- Latest preview-host validation: Vercel exact-host mapping tests pass; full frontend suite has 32 tests passing, typecheck/lint/build pass. Hosted migrations 001-005 and active AGS tenant (`max_clients=100`) are provisioned; reloading the production alias reached the GluteHouse login. Both invitation functions are ACTIVE with JWT verification enabled. Supabase Auth signup is disabled and the test redirect is configured. Remote CORS preflights return 204 for both functions and allow the Supabase JS `x-client-info` header; anonymous invitation POST returns 401. User confirmed that invitation delivery and entry from the link succeeded with a real email before the latest template redesign. Updated Spanish subject/HTML are saved in Supabase Production and represented locally; the redesigned email has not yet been re-sent. The user observed that an already-existing email cannot be invited; duplicate active members are intentionally rejected, while attachment of an existing Auth identity is not implemented.
- Database/RLS changes: `npx supabase test db` against the local stack; test both permitted and denied tenant/role/status paths.
- CU-01 auth/session changes: `scripts/smoke-cu01-local.ps1`; browser login accounts use `scripts/dev-test-user.ps1` and must be deleted after checks.
- Local SQL caveat: `supabase db query` runs one statement at a time; use local `psql` for controlled multi-statement scripts. Run Supabase commands from the project directory.
- For an external delivery test, configure an SMTP provider with a verified sender, keep credentials out of Git/Vite, restart local Supabase without deleting volumes, and restart `npx supabase functions serve` afterward.
- Before production email delivery, provision a platform-owned sending domain and configure SPF, DKIM, and DMARC. Per-gym From addresses are deferred until domain ownership verification and secure credential management exist.
- Vercel preview can use an exact-host tenant mapping; production still requires the intended custom tenant domain and Supabase Auth redirect allowlist.
- Do not commit `.env.local`, secrets, `node_modules`, or `dist`.

## Required Status-Update Task

At the end of every implementation or documentation change, update this snapshot in the same work item:

- Mark any touched use case as implemented, partial, blocked, or planned based on verified evidence.
- Record schema, security, seed, test, or configuration changes and validation results.
- Refresh the immediate next step if dependencies or decisions changed.
- Keep the distinction between committed implementation and local uncommitted changes accurate.
- If no project status changed, explicitly state that the status was reviewed and remains accurate; do not add noise-only edits.