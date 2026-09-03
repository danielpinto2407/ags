# AGS Visual System

## Existing System

- Display font: `Sora`, configured as `font-display`.
- Body font: `Inter`, configured as `font-sans` and used by the global body style.
- Primary brand palette: Tailwind `brand-*` tokens in `tailwind.config.js`.
- Neutral palette: zinc.
- Status colors: emerald for positive/active, amber for warnings, brand for primary/highlight states.
- Effects: `shadow-neon`, `shadow-neon-sm`, and `shadow-neon-lg`.
- Motion: `slide-up`, `fade-in`, and `scale-in`.
- Global primitives and responsive helpers: `src/index.css`.

## Rules For New Components

- Reuse existing Tailwind tokens and component patterns before adding arbitrary values.
- Preserve typography, spacing, radii, borders, shadows, focus states, contrast, and phone/full preview behavior.
- Add a named shared token or reusable component when a visual variant appears more than once.
- Keep visible UI text in Spanish.
- Use Lucide icons for interface actions where an icon exists.
- Do not create a visible control without implementing its behavior or clearly disabling it.
- Do not place tenant branding, database records, or SDK calls directly in a visual component.

## Database-Driven Tenant Theme

Future theme flow:

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
