# AGS Project Handoff

Last verified: 2026-11-22

This is a continuity note for current focus and verified release evidence, not a feature catalog or deployment authority. Product goals and acceptance behavior live in `product-context.md`; schema/security contracts live in `data-contracts.md`; implementation workflow lives in `feature-workflow.md`. Check GitHub for PR state, Supabase for migrations/functions, and Vercel for deployments. Update this handoff only when the focus, next step, blocker, or verified evidence materially changes.

## North Star

Complete and validate the personalized-training path: coach invitation -> member activation -> coach publishes training -> student records performed exercise -> student sees progress. Full use-case scope and deferred goals are in `product-context.md`; tenant ownership, execution, and RLS details are in `data-contracts.md`.

## Current Focus

- **Current work:** the CU-07 super-admin release is deployed, and the coach-invitation flow has reached a Production-verified CORS/branding fix.
- **Release state:** Supabase Production is at migrations 001-047. PR #37 includes migrations 042-047 and `platform-provision-coach`. Migrations 040-041 add execution comments and author-name snapshots. The app is deployed on Vercel with `/platform` as the neutral super-admin route.
- **Next step:** verify the custom-domain DNS, complete the coach invitation lifecycle, and continue profile management, tenant administration, plans/billing decisions and audit activity. The custom `admin.tugimnasioapp.com` hostname remains pending external DNS configuration.
- Do not create, publish, or complete Production training data for testing without explicit confirmation.
- CU-04B biometrics remain pending the coach form, metric catalogue, and units definition. Other deferred scope is listed in `product-context.md`.

## Verified Release Snapshot

- **GitHub:** PR #27 is merged at `ddb724b`, PR #28 at `4a739f2`, PR #29 at `ec624d1`, PR #30 at `5fd5f09`, PR #31 at `4d80fe9`, PR #32 at `57e59c5`, PR #33 at merge `0fc60d5` (`dd76595`), PR #34 at merge `26b1b2e`, PR #35 at merge `1ba9023`, PR #36 at merge `aec910e`, and PR #37 at merge `a8b7875`.
- **Supabase Production:** project `ags` (`vmrcwizgluzvsmmkkhnt`) is at migrations 001-047. Remote migration list confirms all 047 migrations; no migrations are pending.
- **Auth email:** recovery/invitation subjects and tenant logo/palette are deployed. Migration 039 synchronizes validated `gym_body_font` and `gym_display_font` metadata for profiles and tenant theme changes; `invite-personalized-member` supplies the same fields for initial invitations. Both templates use safe fallback stacks. Hosted SMTP settings were preserved; no real-account email was sent.
- **Web:** `https://ags-roan-iota.vercel.app/platform` serves the neutral super-admin login. The custom domain `admin.tugimnasioapp.com` is attached to Vercel but still has unresolved CNAME DNS configuration. Git commits `1604c94`, `ba39a02` and `f33ae6c` contain the formal coach email, CORS fix and tenant-branding propagation.
- **Branding/media:** the user validated image upload. Production browser loaded the gym logo and Wilson's photo from Storage without broken images.

## Recent Evidence

- **Coach browser sweep:** dashboard showed 4 members (3 active, 1 inactive); roster search/filters worked; shared and gym exercise libraries loaded (15 shared, 2 gym-owned); routine editor opened in single-date and cycle modes; profile/logo loaded. The invite dialog was checked and closed without sending an invite.
- **Student browser sweep:** home, routines, progress, and profile loaded for Wilson. Routines/progress showed empty states; logo/photo loaded. No workout was started or modified.
- **Automated local checks for CU-04C:** lint, typecheck, Vitest 80/80, build, and pgTAP 254/254 pass with migration 033 applied locally. Known non-blocking warnings: TypeScript 5.6.3 is beyond the declared typescript-eslint range; Browserslist and esbuild options need maintenance.
- **PR #27 validation:** typecheck, lint, Vitest 82/82, build, and pgTAP 261/261 passed. Supabase migrations 034/035 were applied before frontend merge; remote checks confirm the tenant description column, versioned per-set RPC, and preserved legacy RPC. Public Vercel bundle contains the per-set UI, student empty-state copy, coach `Programado` label, and tenant description form.
- **PR #28 validation:** typecheck, lint, and build passed; Vercel Preview and Production deployments completed successfully. User-facing cycle attempt labels now read “Ciclo 1”, “Ciclo 2”, etc.
- **Cycle-card UI update:** `CoachProgramRoutine` now selects cycle slots through responsive cards; student cycle copy describes routines rather than calendar days. Local browser login confirmed the coach can select multiple routine cards and the existing editor follows the selected slot; student home shows routine-based copy and student selection cards remain unchanged. Typecheck, lint, 82 Vitest tests, and build pass. No DB or production data was changed.
- **Tenant loading icon:** PR #29 and migration 036 originally added tenant-scoped uploads and the profile control. PR #32/migration 037 removed the profile control, upload repository methods, theme field, RPC, and policies. All app loading states use the standard `LoaderCircle`; existing Storage objects remain unreferenced.
- **PR #29 validation (at release):** typecheck, lint, Vitest 82/82, build, and pgTAP 272/272 passed before merge. Its loading-icon feature has since been retired by PR #32/migration 037.
- **Cycle carousel refinement / PR #30:** coach cycle slots use a horizontal scroll-snap rail with compact cards and previous/next controls; 20 slots were exercised in the local browser at mobile width, confirming horizontal navigation and compact height. Selection/editor behavior is unchanged; no data was saved. Typecheck, lint, Vitest 82/82, build, Vercel Preview, and Vercel Production deployment pass. The current product rule still limits cycle length to 20.
- **CU-01A recovery branding:** Production initially had the logo configured but `gym_logo_url` absent from all 5 Auth accounts. PR #32/migration 038 backfilled current profiles and syncs branding on tenant theme/profile changes. A local Mailpit test rendered the actual Production logo URL; a read-only Production aggregate now confirms metadata on 5/5 accounts. No Production recovery email was sent for testing.
- **Loader retirement:** PR #32/migration 037 removed loader policies/RPC and theme references; `TenantLoadingIndicator` keeps the standard spinner. Local pgTAP passes 270/270; Production confirms the loader function, policies, and theme key are absent. Existing Storage objects were not deleted.
- **Tenant email typography / PR #33:** migration 039 was applied locally and to Production, the invitation Edge Function was redeployed, and both Auth templates were updated through `config push`. Local pgTAP 14/14 and Vitest 88/88 pass, and local Mailpit rendered valid DM Sans/Fraunces and Roboto/Sora combinations for synthetic users. Malicious font values were rejected or rendered safely by the template engine. Gmail/unsupported email-client display remains unverified; Arial/Georgia stacks are fallbacks.
- **CU-04C workout comments:** migration 040 was applied locally and to Production. The assigned coach and owning student can exchange plain-text comments on one registered workout; workout values remain read-only and comment names come from active profiles. Local browser testing verified coach creation, student reply, coach re-read and full-name attribution. Synthetic comments were deleted. pgTAP 7/7 and Vitest 88/88 pass.
- **Collapsible comment presentation / PR #35:** comment threads now start collapsed, show `Comentarios (n)`, use an accessible native `details/summary`, and expand the existing composer thread. Comment surfaces use tenant brand `brand-950/20` and `brand-950/40` treatments rather than neutral gray containers. Local open/close behavior, typecheck, lint, 88 Vitest tests and build pass.
- **Tenant equipment options:** CU-02/CU-07 use a simple tenant-scoped option catalogue for equipment labels. Local implementation includes migrations 042-047, super-admin create/update/archival RPCs and UI, coach provision via the `platform-provision-coach` Edge Function, dynamic exercise equipment fields, and coach read access; not deployed. Existing exercise equipment remains backward-compatible; no physical machine specification or safety checklist is planned. A local super-admin shell, repository and 042/043 migrations were implemented and pass local browser/pgTAP checks; they remain uncommitted and unpublished until the full feature is reviewed.
- **Comment author-name fix / PR #36:** migration 041 adds server-snapshotted `author_name`, backfills existing comments, and prevents client override.
- **Super-admin release / PR #37:** migrations 042-047 and `platform-provision-coach` are deployed to Production. `wdpinto@utp.edu.co` is an active `super_admin` with `tenant_id` and `coach_id` null. Its previous test routine assignment, execution and invitation were removed; no real student profile was affected. The frontend reads `author_name` directly, so a student no longer triggers a blocked profile lookup and sees the coach's profile name instead of `Usuario`. pgTAP 9/9, Vitest 88/88, typecheck and build pass.
- **Coach invitation browser validation:** Production failed at CORS because `x-client-info` was omitted from `Access-Control-Allow-Headers`. Commit `ba39a02` deployed the header fix. The first rerun created `wdpinto1@gmail.com` successfully as `coach_admin`, active, tenant AGS, pending email confirmation. Commit `f33ae6c` then deployed tenant logo/colors/fonts in invitation metadata. The original invitation was sent before the branding fix and should not be considered a branding-verified resend; future invitations use the tenant theme.
- **Coach invitation template:** Production Auth uses the formal `coach_admin` template and subject "Invitación para formar parte del equipo de coaching". The template supports tenant name, logo, palette and fonts. Local Mailpit validation showed the formal coach body and branding path; Gmail visual rendering still needs a real recipient acceptance/review.
- **Expired/orphaned account cleanup:** the stale `wdpinto1@gmail.com` identity and its expired pending invitation were intentionally removed and verified absent before reinvitation. A verified account with an active profile must not be removed by generic cleanup.

## Missing / Deferred Implementation

- **Invitation lifecycle:** distinguish resend from reinvite, show pending/expired state in the super-admin UI, add a coach retry/revoke action, and prevent duplicate unconfirmed identities.
- **Coach invitation records:** the current coach provisioning flow does not persist a coach invitation row in `tenant_invitations`; an automated expiry cleanup and UI status need a durable lifecycle record.
- **Custom production hostname:** add the CNAME `admin` -> `e3e97353b4dc59ce.vercel-dns-017.com.` and verify `admin.tugimnasioapp.com` in Vercel/DNS.
- **Production email acceptance:** have a real coach accept the latest branded invitation, verify password creation/redirect and confirm that the dashboard identifies the role as `coach_admin`.
- **Production audit/observability:** track super-admin tenant and coach mutations, function failures and invitation resend/revoke actions.
- **Plans/billing:** tenant plan, billing, quotas and payment integration are not implemented; capacity is still governed by the existing in-app rules.
- **CU-04B biometrics:** coach metric form, metric catalogue and units remain pending.
- **Deferred product scope:** detailed acceptance criteria and deferred goals remain in `product-context.md`.

## Preservation And Safety

- Existing local development accounts, routines, and executions are intentionally retained. Do not delete/reset them as cleanup; they are not Production data.
- Production data and Auth identities are real. Get explicit user approval before test writes, invitation sends, or destructive operations.
- `public/ags-glutehouse-icon.png` is a generated redesign, not a faithful conversion of the supplied logo; do not treat or publish it as the approved brand asset.
