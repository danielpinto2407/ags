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
- Are personalized assignments scoped to tenant, student, and date, with drafts hidden from students and published work visible only to its owner?
- Does invitation provisioning happen server-side, with role/tenant assigned by trusted code and capacity enforced atomically?
- Is `tenants.max_clients` always at least 1, with pending membership onboarding counted consistently? Keep this gym limit separate from future per-class capacity.
- Does invitation acceptance grant gym app access without booking a class, and does post-login navigation follow the server-authorized service track?
- Does invitation acceptance require the member to set a reusable password, verify the invitation email/session, and allow a subsequent password login?
- Are demo workout routines/metrics clearly separated from actual member assignments after onboarding?
- Does personalized programming take priority for personalized members, while group-only discovery/booking remains gated until CU-10 is implemented?
- Can one member hold both service entitlements under one Auth identity, with personalized programming primary and group-class data/navigation separate?
- Is gym member capacity counted once per unique member, regardless of the number of service entitlements?
- Is the responsible coach relationship explicit rather than inferred permanently from who sent the invitation?

## UI and Visuals

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
- Do invitation/capacity tests cover unauthorized coaches, wrong tenant, full capacity, concurrent requests, and expired/cancelled invitations?
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
