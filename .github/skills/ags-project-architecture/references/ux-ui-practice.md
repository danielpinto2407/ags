# AGS UX/UI Practice

Use this guide before designing or changing a user-facing flow. It supplements `visual-system.md`: the visual system defines the existing brand language; this guide defines how to evaluate whether an interaction serves the user well. A familiar AGS style is not, by itself, evidence that the flow is clear or usable.

## Before UI Implementation

For every new flow or material change to an existing one:

1. **Name the user and task.** Identify the role, goal, trigger, frequency, device/context, and what success means. Use the relevant CU acceptance behavior; do not invent product policy to make a screen easier to build.
2. **Inspect the current experience.** Follow the existing flow in the browser or code, including its entry and return paths. If the user supplies observations, screenshots, or corrections, treat them as primary evidence and preserve them as requirements.
3. **Map the interaction before the layout.** Write a short flow or screen outline covering the main path, decisions, validation, and loading, empty, error, success, and permission states. Identify destructive, irreversible, or externally visible actions and keep them explicit and confirmable.
4. **Choose a pattern with a reason.** Reuse an existing component when it fits. Otherwise compare at least one plausible alternative for navigation, data entry, feedback, and recovery. Prefer the least surprising pattern that makes the user's next action and current state clear; do not add controls that have no working behavior.
5. **Check the relevant guidance.** Consult the sources below when the pattern is new, complex, safety/privacy-sensitive, or has accessibility implications. Record the chosen pattern and any important trade-off in the issue/PR or task notes for substantial work; no standalone design document is required for a small change.

The short design rationale should answer: **Who is doing what? What states and edge cases matter? Why this interaction pattern? How will we verify it?**

## Source Hierarchy

- **Product and data truth:** `product-context.md`, `data-contracts.md`, and the owning repository/domain types. These determine what the app may promise and which data/actions are allowed.
- **Observed user evidence:** current browser behavior, production-safe observations, user testing, supplied screenshots, and direct user feedback. An observed mismatch can justify changing the UI, but not silently changing business rules.
- **Existing AGS system:** `visual-system.md`, shared components, tenant theme tokens, and nearby screens. Reuse these unless they conflict with task clarity, accessibility, or responsive behavior; if so, explain the exception and fix the reusable pattern where appropriate.
- **Platform and accessibility guidance:** use official, current references relevant to the specific control. Prefer W3C [WCAG 2.2](https://www.w3.org/TR/WCAG22/), the [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/), and [MDN HTML elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element) for semantics, keyboard interaction, focus, forms, dialogs, and error feedback. For a service-specific interaction, consult that service's official design/API guidance.
- **Secondary UX research:** use reputable, relevant guidance for a genuine unresolved question. State which evidence applies; do not present generic heuristics as user research or spend time browsing for a pattern already established and working in AGS.

When sources conflict, follow product/security constraints first, then accessible platform semantics, then the AGS visual system. Surface unresolved product choices instead of deciding them through layout.

## Interaction And Visual Checks

- Make hierarchy follow the task: show the current context, the primary action, and the consequence before secondary detail. Keep repeated operational screens scannable rather than turning them into decorative dashboards.
- Match controls to the action: text/number/date input for values, select/menu for bounded options, checkbox/toggle for independent binary state, tabs for peer views, slider only for a continuous bounded scale, and a button for an action. Do not use a visual control whose behavior differs from its familiar meaning.
- Make labels persistent and specific. Placeholder text is an example, not the only label. Explain constraints before submission and identify errors next to the relevant field in Spanish.
- Preserve user input when validation or network requests fail. Prevent accidental double-submit, show progress, confirm success, and provide a safe retry/recovery path.
- Distinguish loading, empty, unavailable, permission-denied, and error states. An empty state must describe the actual data state and offer only a valid next step; do not imply missing data is a system failure or hardcode a status that should be data-derived.
- Destructive or externally visible actions (invite/send, publish, archive, activate/deactivate, upload/replace) must be clear about target and consequence. Do not test them against Production unless explicitly authorized; prefer a local test fixture or read-only inspection.
- Use semantic HTML before ARIA. Ensure keyboard operation, visible focus, meaningful accessible names, correct roles/states, and announcements for asynchronous result/error changes. Avoid custom ARIA widgets when a native control works.
- Check text zoom/wrapping and at least a narrow phone viewport plus a desktop viewport. Avoid horizontal overflow, clipped labels, overlapping controls, and touch targets too small for the task; inspect long Spanish names/content and empty/error/loading variants.
- Use tenant/role data truthfully. Provide stable branded/person icons when media is absent or fails, and never render broken-image placeholders or sample values as real records.

## Verification Before Closeout

Verify a task scenario, not just that the page renders:

- Can the intended role reach the feature, understand what is current, and complete the primary task without guessing?
- Do validation, cancel/back, retry, duplicate submission, empty data, slow/failing request, and permission-denied paths preserve safe state and give clear feedback?
- Does the visible state match persisted data after navigation/reload where persistence is expected?
- Are read-only paths actually read-only, and are writes scoped/authorized by the backend rather than only hidden in the UI?
- Do keyboard/focus and accessible names work for the changed interaction? Does the layout remain usable on phone and desktop?
- For an audited live workflow, distinguish what was exercised from what could not be exercised due to missing data/permissions. Never create or alter Production records just to make a screen non-empty without explicit approval.

For substantial flows, write the manual test as a concise role + starting state + action + expected result sequence in the PR/task evidence. Keep visual preferences separate from verified usability findings.