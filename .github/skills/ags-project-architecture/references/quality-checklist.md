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
- Are only public client configuration values exposed to Vite?
- Are service-role keys and secrets excluded?
- Is the integration the simplest functional approach that preserves a replacement path?

## Verification

- `npx supabase test db` passes for database migrations and RLS changes.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- Relevant behavior was manually tested.
- No unrelated files or generated artifacts were changed.
