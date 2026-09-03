# AGS Product Context

## Product

AGS GluteHouse is intended to become a multi-tenant fitness SaaS. The current application is a React/Vite local prototype; the use cases are the source of truth for product behavior.

## Actors

- `super_admin`: manages gyms, plans, capacity, feature flags, themes, billing state, and suspension.
- `coach_admin`: manages students, exercises, templates, and personalized routines within a gym.
- `user_personalized`: consumes assigned routines, records actual loads and RPE, completes exercises, and views progress.
- `user_general`: future profile for group classes and gym events.
- Unauthenticated visitor: resolves the gym and theme before login.

## Use-Case Map

| Case | Behavior | Status |
|---|---|---|
| CU-00 | Detect tenant by subdomain, load theme, handle unknown/suspended tenant | planned |
| CU-01 | Authenticate, validate profile/tenant, redirect by role | simulated |
| CU-01B | Register students and enforce active capacity | partial UI |
| CU-02 | Create tenant-owned exercise with video and coach author | local UI |
| CU-02B | Create reusable routine templates and reorder items | planned |
| CU-03 | Assign routine by student/day/date, template, clone, draft, publish | partial local UI |
| CU-04 | Execute routine, completion, target/actual load, RPE, offline sync | partial UI |
| CU-04B | Load history, progression, and personal records | planned |
| CU-05 | Exercise detail, video, rest timer, sound/vibration alert | partial UI |
| CU-06 | Direct WhatsApp contact with coach | placeholder |
| CU-07 | Super-admin gym, plan, capacity, theme, and subscription management | planned |
| CU-08 | Feature flags by gym and plan | planned |
| CU-09 | Suspend/reactivate gym access | planned |

## Product Invariants

1. Every tenant-owned record carries or resolves a `tenantId`.
2. Tenant scope, actor role, profile status, and tenant status apply to protected features.
3. Client-side role switching is demo tooling, never authorization.
4. Routines are scoped to tenant, student, and date/day slot.
5. Capacity is checked before confirming student registration.
6. `SUSPENDED` tenants and `INACTIVE` profiles are blocked even with cached sessions.
7. Draft, published, offline, failed, and synchronized states are distinct.
8. Target load, actual load, RPE, completion, and historical records are distinct concepts.
9. Feature flags affect visibility, but backend authorization still enforces access.

## Future Domain Entities

```text
Tenant
Profile/User
Exercise
RoutineTemplate
RoutineTemplateItem
RoutineAssignment
RoutineAssignmentItem
WorkoutSession
SetLog
ProgressRecord
FeatureFlags
```
