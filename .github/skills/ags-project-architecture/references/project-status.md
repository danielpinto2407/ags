# AGS Project Handoff

Last verified: 2026-11-17

This is a continuity note for current focus and verified release evidence, not a feature catalog or deployment authority. Product goals and acceptance behavior live in `product-context.md`; schema/security contracts live in `data-contracts.md`; implementation workflow lives in `feature-workflow.md`. Check GitHub for PR state, Supabase for migrations/functions, and Vercel for deployments. Update this handoff only when the focus, next step, blocker, or verified evidence materially changes.

## North Star

Complete and validate the personalized-training path: coach invitation -> member activation -> coach publishes training -> student records performed exercise -> student sees progress. Full use-case scope and deferred goals are in `product-context.md`; tenant ownership, execution, and RLS details are in `data-contracts.md`.

## Current Focus

- **Current work:** tenant-configurable loading icon. Active coaches can upload or reset a tenant icon; content loaders use it with the existing spinner as fallback. Cycle cards remain part of the unshipped local UI work.
- **Release state:** Supabase Production is at migrations 001-035; Vercel Production deployments for both merges completed successfully. The old performance RPC remains available for rollout compatibility.
- **Next step:** finish local browser verification and prepare a feature PR for the loading icon and cycle-card UI if requested. Production remains at migration 035; migration 036 is local only. Do not create or alter real member workouts for testing without explicit confirmation.
- Do not create, publish, or complete Production training data for testing without explicit confirmation.
- CU-04B biometrics remain pending the coach form, metric catalogue, and units definition. Other deferred scope is listed in `product-context.md`.

## Verified Release Snapshot

- **GitHub:** PR #27 is merged to `main` at `ddb724b`; PR #28 is merged at `4a739f2` and replaces user-facing “Vuelta N” labels with “Ciclo N”.
- **Supabase Production:** project `ags` (`vmrcwizgluzvsmmkkhnt`) is at migrations 001-035. Remote migration list confirms 035; no migrations are pending.
- **Auth email:** revised Invite/Recovery templates are deployed; `invite-personalized-member` is active at version 4 with `verify_jwt=true`. The user manually confirmed the new invitation template applies.
- **Web:** `ags-roan-iota.vercel.app` serves the latest bundle; Vercel Production deployment for merge SHA `4a739f2147cb638a6c9452d1bd7105c2991caebc` completed successfully. The custom domain `ags.tugimnasioapp.com` still has unresolved DNS.
- **Branding/media:** the user validated image upload. Production browser loaded the gym logo and Wilson's photo from Storage without broken images.

## Recent Evidence

- **Coach browser sweep:** dashboard showed 4 members (3 active, 1 inactive); roster search/filters worked; shared and gym exercise libraries loaded (15 shared, 2 gym-owned); routine editor opened in single-date and cycle modes; profile/logo loaded. The invite dialog was checked and closed without sending an invite.
- **Student browser sweep:** home, routines, progress, and profile loaded for Wilson. Routines/progress showed empty states; logo/photo loaded. No workout was started or modified.
- **Automated local checks for CU-04C:** lint, typecheck, Vitest 80/80, build, and pgTAP 254/254 pass with migration 033 applied locally. Known non-blocking warnings: TypeScript 5.6.3 is beyond the declared typescript-eslint range; Browserslist and esbuild options need maintenance.
- **PR #27 validation:** typecheck, lint, Vitest 82/82, build, and pgTAP 261/261 passed. Supabase migrations 034/035 were applied before frontend merge; remote checks confirm the tenant description column, versioned per-set RPC, and preserved legacy RPC. Public Vercel bundle contains the per-set UI, student empty-state copy, coach `Programado` label, and tenant description form.
- **PR #28 validation:** typecheck, lint, and build passed; Vercel Preview and Production deployments completed successfully. User-facing cycle attempt labels now read “Ciclo 1”, “Ciclo 2”, etc.
- **Cycle-card UI update:** `CoachProgramRoutine` now selects cycle slots through responsive cards; student cycle copy describes routines rather than calendar days. Local browser login confirmed the coach can select multiple routine cards and the existing editor follows the selected slot; student home shows routine-based copy and student selection cards remain unchanged. Typecheck, lint, 82 Vitest tests, and build pass. No DB or production data was changed.
- **Tenant loading icon:** local migration 036 adds the tenant-scoped `loading-icons/` Storage path and `set_own_tenant_loading_icon`; pgTAP passes 272 assertions. The tenant theme validates nullable `loadingIconUrl`, coach profile exposes upload/reset, and content loading indicators use the custom image or default LoaderCircle. The profile control rendered locally; no icon was uploaded and no Production schema/data was changed.

## Preservation And Safety

- Existing local development accounts, routines, and executions are intentionally retained. Do not delete/reset them as cleanup; they are not Production data.
- Production data and Auth identities are real. Get explicit user approval before test writes, invitation sends, or destructive operations.
- `public/ags-glutehouse-icon.png` is a generated redesign, not a faithful conversion of the supplied logo; do not treat or publish it as the approved brand asset.
