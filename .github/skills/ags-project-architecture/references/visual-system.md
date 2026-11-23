# AGS Visual System

## Existing System

- Display and body fonts come from the validated tenant theme, with configured defaults when missing.
- Primary brand palette: Tailwind `brand-*` tokens in `tailwind.config.js`.
- Neutral palette: zinc.
- Status colors: emerald for positive/active, amber for warnings, brand for primary/highlight states.
- Effects: `shadow-neon`, `shadow-neon-sm`, and `shadow-neon-lg`.
- Motion: `slide-up`, `fade-in`, and `scale-in`.
- Global primitives and responsive helpers: `src/index.css`.

## Shared Component Rules

- `ModalShell` is the only overlay shell for dialogs, selectors and confirmation screens. Mobile uses a bottom sheet and desktop uses a centered panel; both use the tenant/platform CSS variables, not hardcoded zinc/black surfaces.
- `StatusToggle` is the standard reversible active/archived/suspended control. It must use confirm-before-change behavior and close after success or cancellation.
- `ConfirmModal` wraps destructive or bulk confirmations and must replace `window.confirm`, native alerts and independent confirmation markup.
- `FeedbackMessage` is the standard inline success/error/warning/info state. It must carry `role="alert"` or `role="status"` and tenant/theme-compatible colors.
- `AppButton` owns primary, secondary, danger and ghost command variants. Screens should not redefine the same button geometry and state classes repeatedly. It must be adopted instead of preserving parallel command components.
- Add no fallback/legacy component while migrating a shared primitive. Remove obsolete variants and imports in the same edit, and prove usage with search/typecheck/lint/tests. A new shared component must be reachable from real UI, not retained as speculative dead code.
- `SelectModalField`, `PasswordField`, `ProfileImagePicker`, `ModalShell`, `StatusToggle`, `FeedbackMessage`, `AppButton` and future shared fields are first-choice primitives. Search these components before adding a new modal, toggle, message or form control.
- A confirmation must show the item/action affected, allow cancel, disable repeat submission, expose an explicit busy label, and never mutate data before confirmation.
- All modals must close by X, backdrop, confirmed/cancelled action or Escape. They must lock the app scroll while open and restore it afterward.
- Background/overlay opacity must derive from tenant/platform variables. Dialogs must not use fixed black surfaces or AGS-only copy/colors; use `tenant-surface`, `tenant-border`, `tenant-text`, `tenant-muted`, `tenant-primary` and `tenant-on-primary`.

## Rules For New Components

- Reuse existing Tailwind tokens and component patterns before adding arbitrary values.
- Preserve typography, spacing, radii, borders, shadows, focus states, contrast, and phone/full preview behavior.
- Add a named shared token or reusable component when a visual variant appears more than once.
- Primary command buttons use `bg-brand-500 hover:bg-brand-action-hover`: `brand-500` maps to the tenant's `primaryColor`, the hover is derived from it, and `brand-600` maps to `secondaryColor` and is not interchangeable. Preserve distinct selection and status treatments.
- Verify actual computed colors for login and changed primary actions with at least two tenant palettes, including a palette where primary and secondary differ. Check default, hover, focus and disabled states, mobile and desktop. Validate text contrast against the actual background; a valid hexadecimal color alone does not guarantee accessible contrast.
- Scope global CSS to exact class tokens and actual pseudo-states. Substring selectors must not activate `hover:`, `focus:`, or `disabled:` styling in the resting state.
- Keep visible UI text in Spanish.
- Use Lucide icons for interface actions where an icon exists.
- Do not create a visible control without implementing its behavior or clearly disabling it.
- Do not place tenant branding, database records, or SDK calls directly in a visual component.

## Database-Driven Tenant Theme

Current local flow (production subdomain/DNS wiring remains pending):

```text
hostname/subdomain -> tenant resolver -> validated TenantTheme -> CSS variable adapter -> AppShell/components
```

Recommended contract:

```ts
interface TenantTheme {
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  accentColor?: string;
}
```

Theme data must be validated and mapped to controlled CSS variables. Never accept arbitrary CSS, Tailwind class names, raw style blocks, or unvalidated font URLs from the database. Always provide a neutral fallback for unknown, unavailable, or suspended tenants.

## Transactional Email Branding

- All tenant emails use the same structure and visual styles as `supabase/templates/recovery.html` and `supabase/templates/invite.html`: logo or gym name, heading, content, primary action, security notice, divider and signature. Only purpose-specific content and link behavior differ.
- Supabase renders these HTML files independently; it does not fetch `tenants.theme` or include another HTML template. Server-side invitation metadata and migration-backed Auth metadata synchronization supply validated `gym_*` fields. Never trust a browser-supplied tenant ID, color, logo, or redirect for an email.
- Trace `tenants.theme.bodyFont` and `displayFont`, along with logo, name and colors, through every email delivery path into the templates. The body and headings use validated tenant font families in supported clients; fixed Arial/Georgia stacks remain the fallback. The invitation path supplies `gym_body_font` and `gym_display_font` in Auth metadata; the recovery/profile path synchronizes the same fields through migration 039 and existing tenant/profile triggers.
- Choose email-compatible font loading based on verified client support; include safe fallback font stacks for missing metadata, unsupported clients or unavailable fonts. Never interpolate unchecked font names or URLs into HTML/CSS. Font names are restricted to trimmed alphanumeric/space values of 1-50 characters. Verify font families with distinct tenant themes and test at least one client that uses the fallback; report clients that cannot be verified.
- Use `gym_primary_color`, `gym_background_color`, `gym_surface_color`, `gym_text_color`, `gym_muted_color`, `gym_border_color`, `gym_name`, `gym_logo_url`, `gym_body_font` and `gym_display_font`. Keep identical fallback behavior in every template for unavailable metadata. A fallback is not the normal source of tenant colors or fonts. Keep `{{ .ConfirmationURL }}` and purpose-specific security copy intact.
- Email clients need inline CSS. Both templates must have identical inline style sequences; update both together and run `npx vitest run src/domain/tenantVisualContract.test.ts`. That static test checks style parity and field presence, not font loading, delivery, or client rendering. Local Mailpit verification has covered valid invitation/recovery fonts and rejected malicious values; two different valid font pairs and fallback behavior should also be checked in real email clients. Do not send test messages to real Production accounts.
- Current limitation: the theme validates hexadecimal syntax but not contrast, and both email CTAs currently use a white foreground. Do not claim arbitrary tenant palettes are accessible; enforce or derive an on-primary color across UI and email before accepting light primary colors.
- Changes to deployed email templates or Auth configuration require a reviewed deployment and Production verification. Never run a broad `supabase config push` with local-only redirects or settings without inspecting the remote diff and obtaining explicit approval.
