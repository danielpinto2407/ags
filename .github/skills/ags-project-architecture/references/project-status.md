# AGS Project Handoff

Last verified: 2026-11-16

This is a continuity note for current focus and verified release evidence, not a feature catalog or deployment authority. Product goals and acceptance behavior live in `product-context.md`; schema/security contracts live in `data-contracts.md`; implementation workflow lives in `feature-workflow.md`. Check GitHub for PR state, Supabase for migrations/functions, and Vercel for deployments. Update this handoff only when the focus, next step, blocker, or verified evidence materially changes.

## North Star

Complete and validate the personalized-training path: coach invitation -> member activation -> coach publishes training -> student records performed exercise -> student sees progress. Full use-case scope and deferred goals are in `product-context.md`; tenant ownership, execution, and RLS details are in `data-contracts.md`.

## Current Focus

- **Current work:** CU-04C coach review of assigned-student workout executions is implemented on `feat/coach-workout-progress`; PR #25 is open with a Ready Vercel Preview. Migration 033 is applied to Production; the web release is pending PR merge.
- **Next step:** merge PR #25, confirm Vercel Production deployment, then verify the coach read-only history/detail and student-visible disclosure without creating or changing Production workout data.
- Do not create, publish, or complete Production training data for testing without explicit confirmation.
- CU-04B biometrics remain pending the coach form, metric catalogue, and units definition. Other deferred scope is listed in `product-context.md`.

## Verified Release Snapshot

- **GitHub:** PR #24 is merged to `main`; PR #25 contains CU-04C and is open from `feat/coach-workout-progress` at commit `13cf04b`.
- **Supabase Production:** project `ags` (`vmrcwizgluzvsmmkkhnt`) is at migrations 001-033. Remote migration list confirms 033; a post-deploy dry-run reports no pending migrations.
- **Auth email:** revised Invite/Recovery templates are deployed; `invite-personalized-member` is active at version 4 with `verify_jwt=true`. The user manually confirmed the new invitation template applies.
- **Web:** `ags-roan-iota.vercel.app` serves the updated roster bundle. The custom domain `ags.tugimnasioapp.com` still has unresolved DNS.
- **Branding/media:** the user validated image upload. Production browser loaded the gym logo and Wilson's photo from Storage without broken images.

## Recent Evidence

- **Coach browser sweep:** dashboard showed 4 members (3 active, 1 inactive); roster search/filters worked; shared and gym exercise libraries loaded (15 shared, 2 gym-owned); routine editor opened in single-date and cycle modes; profile/logo loaded. The invite dialog was checked and closed without sending an invite.
- **Student browser sweep:** home, routines, progress, and profile loaded for Wilson. Routines/progress showed empty states; logo/photo loaded. No workout was started or modified.
- **Automated local checks for CU-04C:** lint, typecheck, Vitest 80/80, build, and pgTAP 254/254 pass with migration 033 applied locally. Known non-blocking warnings: TypeScript 5.6.3 is beyond the declared typescript-eslint range; Browserslist and esbuild options need maintenance.

## Preservation And Safety

- Existing local development accounts, routines, and executions are intentionally retained. Do not delete/reset them as cleanup; they are not Production data.
- Production data and Auth identities are real. Get explicit user approval before test writes, invitation sends, or destructive operations.
- `public/ags-glutehouse-icon.png` is a generated redesign, not a faithful conversion of the supplied logo; do not treat or publish it as the approved brand asset.
