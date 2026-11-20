# AGS Project Handoff

Last verified: 2026-11-20

This is a continuity note for current focus and verified release evidence, not a feature catalog or deployment authority. Product goals and acceptance behavior live in `product-context.md`; schema/security contracts live in `data-contracts.md`; implementation workflow lives in `feature-workflow.md`. Check GitHub for PR state, Supabase for migrations/functions, and Vercel for deployments. Update this handoff only when the focus, next step, blocker, or verified evidence materially changes.

## North Star

Complete and validate the personalized-training path: coach invitation -> member activation -> coach publishes training -> student records performed exercise -> student sees progress. Full use-case scope and deferred goals are in `product-context.md`; tenant ownership, execution, and RLS details are in `data-contracts.md`.

## Current Focus

- **Current work:** CU-01A self-service password recovery is implemented and verified locally; Production rollout awaits Auth redirect and password-policy verification.
- **Release state:** Supabase Production is at migrations 001-036; Vercel Production deployment for merge SHA `ec624d10e876fe76271534afde71c71c04c90d8c` completed successfully. The old performance RPC remains available for rollout compatibility.
- **Next step:** before releasing CU-01A, confirm the Production Auth redirect allowlist includes the fixed same-origin recovery callback for tenant hosts and align the Production minimum password length to 10. Local Mailpit confirms the custom recovery template is loaded. Do not send recovery email to real users during testing.
- Do not create, publish, or complete Production training data for testing without explicit confirmation.
- CU-04B biometrics remain pending the coach form, metric catalogue, and units definition. Other deferred scope is listed in `product-context.md`.

## Verified Release Snapshot

- **GitHub:** PR #27 is merged at `ddb724b`, PR #28 at `4a739f2`, and PR #29 at `ec624d1`.
- **Supabase Production:** project `ags` (`vmrcwizgluzvsmmkkhnt`) is at migrations 001-036. Remote migration list confirms 036; no migrations are pending.
- **Auth email:** revised Invite/Recovery templates are deployed; `invite-personalized-member` is active at version 4 with `verify_jwt=true`. The user manually confirmed the new invitation template applies.
- **Web:** `ags-roan-iota.vercel.app` serves the latest bundle; Vercel Production deployment for merge SHA `ec624d10e876fe76271534afde71c71c04c90d8c` completed successfully. The custom domain `ags.tugimnasioapp.com` still has unresolved DNS.
- **Branding/media:** the user validated image upload. Production browser loaded the gym logo and Wilson's photo from Storage without broken images.

## Recent Evidence

- **Coach browser sweep:** dashboard showed 4 members (3 active, 1 inactive); roster search/filters worked; shared and gym exercise libraries loaded (15 shared, 2 gym-owned); routine editor opened in single-date and cycle modes; profile/logo loaded. The invite dialog was checked and closed without sending an invite.
- **Student browser sweep:** home, routines, progress, and profile loaded for Wilson. Routines/progress showed empty states; logo/photo loaded. No workout was started or modified.
- **Automated local checks for CU-04C:** lint, typecheck, Vitest 80/80, build, and pgTAP 254/254 pass with migration 033 applied locally. Known non-blocking warnings: TypeScript 5.6.3 is beyond the declared typescript-eslint range; Browserslist and esbuild options need maintenance.
- **PR #27 validation:** typecheck, lint, Vitest 82/82, build, and pgTAP 261/261 passed. Supabase migrations 034/035 were applied before frontend merge; remote checks confirm the tenant description column, versioned per-set RPC, and preserved legacy RPC. Public Vercel bundle contains the per-set UI, student empty-state copy, coach `Programado` label, and tenant description form.
- **PR #28 validation:** typecheck, lint, and build passed; Vercel Preview and Production deployments completed successfully. User-facing cycle attempt labels now read “Ciclo 1”, “Ciclo 2”, etc.
- **Cycle-card UI update:** `CoachProgramRoutine` now selects cycle slots through responsive cards; student cycle copy describes routines rather than calendar days. Local browser login confirmed the coach can select multiple routine cards and the existing editor follows the selected slot; student home shows routine-based copy and student selection cards remain unchanged. Typecheck, lint, 82 Vitest tests, and build pass. No DB or production data was changed.
- **Tenant loading icon / PR #29:** migration 036 adds the tenant-scoped `loading-icons/` Storage path and `set_own_tenant_loading_icon`; pgTAP passes 272 assertions. The tenant theme validates nullable `loadingIconUrl`, coach profile exposes upload/reset, and content loading indicators use the custom image or default LoaderCircle. Production migration and deployment are verified; no custom icon has been uploaded to Production.
- **PR #29 validation:** typecheck, lint, Vitest 82/82, build, and pgTAP 272/272 passed before merge. The public Production bundle contains the upload/reset controls and loading-icon behavior.
- **Cycle carousel refinement / PR #30:** coach cycle slots use a horizontal scroll-snap rail with compact cards and previous/next controls; 20 slots were exercised in the local browser at mobile width, confirming horizontal navigation and compact height. Selection/editor behavior is unchanged; no data was saved. Typecheck, lint, Vitest 82/82, build, Vercel Preview, and Vercel Production deployment pass. The current product rule still limits cycle length to 20.
- **CU-01A local implementation:** login recovery request, generic confirmation, Supabase `PASSWORD_RECOVERY` routing, password update, and sign-out are implemented. Mailpit end-to-end testing verified a valid link, updated password, subsequent Auth sign-in, and a reused/expired link reaching the invalid-link state. After reloading local Supabase config, Mailpit confirmed the recovery subject/copy and tenant palette (`#f4eae3` background, `#7b2545` primary); the latest email explicitly says the password reset was requested and uses one brief sign-off. Temporary local Auth users were deleted; no profile, training data, or Production account was changed. Typecheck, lint, Vitest 86/86, and build pass. Production Auth settings and template delivery remain to be verified before release.

## Preservation And Safety

- Existing local development accounts, routines, and executions are intentionally retained. Do not delete/reset them as cleanup; they are not Production data.
- Production data and Auth identities are real. Get explicit user approval before test writes, invitation sends, or destructive operations.
- `public/ags-glutehouse-icon.png` is a generated redesign, not a faithful conversion of the supplied logo; do not treat or publish it as the approved brand asset.
