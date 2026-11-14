# AGS Quality Checklist

## Architecture

- Does the change map to a documented use case?
- Is actor, tenant, role, status, and feature-flag scope explicit?
- Does each module have one responsibility and one reason to change?
- Do dependencies flow inward from UI to feature/data boundaries without domain-to-UI coupling?
- Were existing modules searched and reused before adding abstractions?

## Data and State

- Is the domain model explicit and typed?
- Is data access behind a repository or service?
- Are browser APIs and SDKs isolated behind adapters?
- Are writes immutable and scoped to the correct tenant, student, date, and entity?
- Are drafts, published data, offline events, failures, and synchronized records distinct?
- Are target load, actual load, RPE, completion, and history distinct?
- Are external and persisted payloads validated?
- Does an assigned exercise retain its complete catalog detail (including instructions, tips, difficulty, and video reference) while keeping prescription overrides separate?
- Are mock and Supabase modes explicit, with no silent fallback or accidental mixing of data sources?
- Are local sample seeds idempotent, tenant-scoped, stable-ID, and free of fake Auth users or real personal data?
- Does CU-03 use the unified `SINGLE_DAY`/`CYCLE` plan model? Is a single-day program tied to its selected date, while cycle-day slots are ordinal plan positions and never calendar-date assignments?
- Are cycle slots ordered and complete (N slots, one routine each), with per-exercise progression and a nonnegative additional-repeat count yielding `1 + additional` total iterations?
- Does the student log actual reps/load/completion once per exercise, independent of prescribed set count, with progress derived from completed exercises / prescribed exercises rather than per-set records?
- Does the student log actual reps/load and completion once per exercise, independent of prescribed set count, while the coach's prescribed sets/reps remain visible as the target? Is progress derived from completed exercises / prescribed exercises rather than per-set logs?
- Are student executions tied to the selected plan/routine/slot and actual execution date, with one start per student/calendar day, same-day-only resume, day-end close/frozen progress, next-day eligibility, and concurrency-safe enforcement?
- Are drafts hidden from students and published plans/routines visible only to their owner? Does the migration preserve tenant/coach/student ownership, prescriptions, and immutable snapshots before retiring date-bound routes?
- Does invitation provisioning happen server-side, with role/tenant assigned by trusted code?
- Does personalized invitation/acceptance/reactivation avoid enforcing `tenants.max_clients` or reserving class seats? Keep any future per-class capacity separate.
- Does invitation acceptance grant gym app access without booking a class, and does post-login navigation follow the server-authorized service track?
- Does invitation acceptance require the member to set a reusable password, verify the invitation email/session, and allow a subsequent password login?
- Are demo workout routines/metrics clearly separated from actual member assignments after onboarding?
- Does personalized programming take priority for personalized members, while group-only discovery/booking remains gated until CU-10 is implemented?
- Can one member hold both service entitlements under one Auth identity, with personalized programming primary and group-class data/navigation separate?
- If a future product decision introduces a gym-wide membership cap, is it defined separately from personalized training and per-class group capacity?
- Is the responsible coach relationship explicit rather than inferred permanently from who sent the invitation?

## UI and Visuals

- Is the user/goal/current context clear, and was the existing flow inspected before choosing a UI pattern?
- Is the chosen interaction pattern justified by the task and consistent with product/data constraints, rather than selected only for implementation convenience?
- Are primary path, decisions, validation, loading, empty, error, success, and permission states explicitly considered? Does empty-state copy reflect actual data?
- Were the relevant official accessibility/platform references checked for new or complex interactions, and are semantics, keyboard/focus, accessible names, and feedback correct?
- Was the changed task exercised in a browser at phone and desktop widths without unsafe Production writes?
- Does the feature reuse `Sora`, `Inter`, Tailwind `brand-*`, zinc/status colors, spacing, radii, borders, shadows, and responsive patterns?
- Are visual tokens centralized rather than duplicated in screens?
- Are loading, empty, error, success, offline, and permission states represented?
- Does every visible control have real behavior or an explicit disabled state?
- Is the Spanish UI preserved?
- Is tenant branding typed, validated, safely mapped to CSS variables, and given a fallback?

## Security and Integration

- Is authorization enforced server-side rather than by hidden navigation?
- Is tenant isolation enforced through backend policies such as RLS?
- Do RLS tests cover inactive profiles and suspended tenants, including allowed self-status and coach administration reads?
- Do invitation tests cover unauthorized coaches, wrong tenant, email mismatch, duplicate/pending invite behavior, and expired/replayed invitations without asserting a personalized capacity limit?
- Are only public client configuration values exposed to Vite?
- Are service-role keys and secrets excluded?
- Do production Auth emails use a platform-controlled, domain-authenticated sender rather than a tenant-supplied From address? Are local Gmail credentials isolated from Vite and Git?
- Is the integration the simplest functional approach that preserves a replacement path?

## Verification

- `npx supabase test db` passes for database migrations and RLS changes.
- `scripts/smoke-cu01-local.ps1` passes for local Auth/session/profile changes and cleans up its temporary account.
- `npm test` passes for unit tests covering the changed behavior.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- Relevant behavior was manually tested.
- The personalized MVP is verified end to end from invitation email through a student completing a published routine; group-class flows are not represented as delivered.
- No unrelated files or generated artifacts were changed.
