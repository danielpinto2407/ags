# AGS Feature Workflow

## Before Editing

1. Identify the use case (`CU-00` through `CU-09`) and acceptance behavior.
2. Identify actor, tenant scope, permissions, affected screen, entities, and state transitions.
3. Decide whether data is local, persisted, asynchronous, offline, or server-backed.
4. Search existing components, hooks, domain functions, repository methods, types, and styles before creating anything.
5. State one local hypothesis about the controlling code path and one focused validation check.

## Implementation Order

1. Add or update domain types and pure functions.
2. Add repository contract and local implementation.
3. Add persistence and payload validation when needed.
4. Add a hook for shared state, subscriptions, or async workflow.
5. Compose the feature screen.
6. Add loading, success, empty, error, offline, and permission states.
7. Wire navigation and feature flags after the feature works independently.
8. Reuse existing components and visual tokens.

## Placement

- Domain model: `src/domain/<entity>.ts`.
- Fixtures: `src/data/mockData.ts` or split files under `src/data/mock/` when needed.
- Repository/service: `src/data/`.
- Browser storage: `src/data/storage/`.
- Shared UI: `src/components/`.
- Application shell/navigation/session/tenant bootstrap: `src/app/`.
- Role-specific composition: `src/screens/student/` or `src/screens/coach/`.
- Repeated feature behavior: feature hook, selector, or domain function.
- Feature-specific tests: keep them near the feature when a test setup exists.

## Quality Rules

- Keep one responsibility per module and one source of truth per business concept.
- Keep external SDKs, browser APIs, and storage behind adapters.
- Prefer the smallest functional integration that satisfies the use case.
- Preserve existing public contracts unless a migration is required.
- Avoid global state libraries, routers, abstractions, and dependencies unless a concrete requirement justifies them.
- Never duplicate calculations, validation, role checks, constants, or visual tokens.
- Do not add speculative folders or generic `utils`, `helpers`, or `services` modules.

## Validation

Run from the directory containing `package.json`:

```powershell
npm run lint
npm run typecheck
npm run build
```

For behavior changes, manually verify role flows, navigation return paths, reload persistence, empty/error states, permissions, and phone/full preview modes.
