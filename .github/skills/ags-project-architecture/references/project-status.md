# AGS Project Handoff

Last verified: 2026-11-20

This is a continuity note for current focus and verified release evidence, not a feature catalog or deployment authority. Product goals and acceptance behavior live in `product-context.md`; schema/security contracts live in `data-contracts.md`; implementation workflow lives in `feature-workflow.md`. Check GitHub for PR state, Supabase for migrations/functions, and Vercel for deployments. Update this handoff only when the focus, next step, blocker, or verified evidence materially changes.

## North Star

Complete and validate the personalized-training path: coach invitation -> member activation -> coach publishes training -> student records performed exercise -> student sees progress. Full use-case scope and deferred goals are in `product-context.md`; tenant ownership, execution, and RLS details are in `data-contracts.md`.

## Current Focus

- **Current work:** remove the tenant-configurable loading icon and repair recovery-email logo branding; code and migrations 037/038 are local and need a follow-up PR.
- **Release state:** Supabase Production is at migrations 001-036. Recovery UI/template/config from PR #31 is deployed; Vercel Production deployment for merge SHA `4d80fe9e2af6469d6c676b9f3ea8f78a830db855` completed successfully. Auth config now has the 10-character password minimum and recovery redirects for the Production alias/owned tenant domain. The SMTP configuration is unchanged.
- **Next step:** review and deploy migrations 037/038 with the loader removal and tenant branding metadata backfill/sync. Existing loading-icon Storage objects are retained but no longer referenced; do not delete stored media without explicit approval.
- Do not create, publish, or complete Production training data for testing without explicit confirmation.
- CU-04B biometrics remain pending the coach form, metric catalogue, and units definition. Other deferred scope is listed in `product-context.md`.

## Verified Release Snapshot

- **GitHub:** PR #27 is merged at `ddb724b`, PR #28 at `4a739f2`, PR #29 at `ec624d1`, PR #30 at `5fd5f09`, and password recovery PR #31 at `4d80fe9`.
- **Supabase Production:** project `ags` (`vmrcwizgluzvsmmkkhnt`) is at migrations 001-036. Remote migration list confirms 036; no migrations are pending.
- **Auth email:** recovery subject/body and branded recovery template from PR #31 are deployed; Supabase Auth config push applied the Production allowlist/minimum-password updates while preserving SMTP. `invite-personalized-member` remains active at version 4 with `verify_jwt=true`.
- **Web:** `ags-roan-iota.vercel.app` serves the recovery link on the login screen; Vercel Production deployment for merge SHA `4d80fe9e2af6469d6c676b9f3ea8f78a830db855` completed successfully. The custom domain `ags.tugimnasioapp.com` still has unresolved DNS.
- **Branding/media:** the user validated image upload. Production browser loaded the gym logo and Wilson's photo from Storage without broken images.

## Recent Evidence

- **Coach browser sweep:** dashboard showed 4 members (3 active, 1 inactive); roster search/filters worked; shared and gym exercise libraries loaded (15 shared, 2 gym-owned); routine editor opened in single-date and cycle modes; profile/logo loaded. The invite dialog was checked and closed without sending an invite.
- **Student browser sweep:** home, routines, progress, and profile loaded for Wilson. Routines/progress showed empty states; logo/photo loaded. No workout was started or modified.
- **Automated local checks for CU-04C:** lint, typecheck, Vitest 80/80, build, and pgTAP 254/254 pass with migration 033 applied locally. Known non-blocking warnings: TypeScript 5.6.3 is beyond the declared typescript-eslint range; Browserslist and esbuild options need maintenance.
- **PR #27 validation:** typecheck, lint, Vitest 82/82, build, and pgTAP 261/261 passed. Supabase migrations 034/035 were applied before frontend merge; remote checks confirm the tenant description column, versioned per-set RPC, and preserved legacy RPC. Public Vercel bundle contains the per-set UI, student empty-state copy, coach `Programado` label, and tenant description form.
- **PR #28 validation:** typecheck, lint, and build passed; Vercel Preview and Production deployments completed successfully. User-facing cycle attempt labels now read “Ciclo 1”, “Ciclo 2”, etc.
- **Cycle-card UI update:** `CoachProgramRoutine` now selects cycle slots through responsive cards; student cycle copy describes routines rather than calendar days. Local browser login confirmed the coach can select multiple routine cards and the existing editor follows the selected slot; student home shows routine-based copy and student selection cards remain unchanged. Typecheck, lint, 82 Vitest tests, and build pass. No DB or production data was changed.
- **Tenant loading icon / PR #29:** migration 036 originally added tenant-scoped uploads and the profile control. Removal is pending: frontend now uses the default LoaderCircle only, migration 037 drops the RPC/policies and strips theme references, while old Storage objects remain unreferenced rather than being destructively deleted.
- **PR #29 validation (at release):** typecheck, lint, Vitest 82/82, build, and pgTAP 272/272 passed before merge. The loading-icon controls described in that release are being removed by follow-up migration 037.
- **Cycle carousel refinement / PR #30:** coach cycle slots use a horizontal scroll-snap rail with compact cards and previous/next controls; 20 slots were exercised in the local browser at mobile width, confirming horizontal navigation and compact height. Selection/editor behavior is unchanged; no data was saved. Typecheck, lint, Vitest 82/82, build, Vercel Preview, and Vercel Production deployment pass. The current product rule still limits cycle length to 20.
- **CU-01A recovery branding:** a read-only Production aggregate found the tenant logo configured but `gym_logo_url` absent from all 5 Auth accounts (1 coach, 4 members). The reset template reads Auth user metadata, and the invite edge function was the only code path populating those branding keys. Migration 038 backfills current profiles and syncs brand metadata on tenant theme/profile changes; local pgTAP covers existing users, theme changes, new profiles, and metadata preservation. Recovery UI/template/Auth config from PR #31 are in Production; migration 038 is pending.
- **Loader retirement / CU-01A follow-up validation:** migration 037 removes the dedicated policies/RPC and clears `loadingIconUrl`; `TenantLoadingIndicator` keeps the standard animated `LoaderCircle`. Local pgTAP passes 270/270 with migrations 037/038. Production remains at 036 until the follow-up PR is merged and applied.

## Preservation And Safety

- Existing local development accounts, routines, and executions are intentionally retained. Do not delete/reset them as cleanup; they are not Production data.
- Production data and Auth identities are real. Get explicit user approval before test writes, invitation sends, or destructive operations.
- `public/ags-glutehouse-icon.png` is a generated redesign, not a faithful conversion of the supplied logo; do not treat or publish it as the approved brand asset.
