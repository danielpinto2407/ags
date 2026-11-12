export type TenantStatus = 'ACTIVE' | 'SUSPENDED';

export interface TenantTheme {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  warmAccentColor: string;
  softAccentColor: string;
  bodyFont: string;
  displayFont: string;
}

export type TenantFeatures = Record<string, boolean>;

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: TenantStatus;
  theme: TenantTheme;
  features: TenantFeatures;
}

export const DEFAULT_TENANT_THEME: TenantTheme = {
  logoUrl: null,
  primaryColor: '#7b2545',
  secondaryColor: '#572239',
  backgroundColor: '#f4eae3',
  accentColor: '#d8bac4',
  surfaceColor: '#fff9f6',
  textColor: '#2b2528',
  mutedColor: '#76696d',
  borderColor: '#e5d8d2',
  warmAccentColor: '#c4a47e',
  softAccentColor: '#c4b1d2',
  bodyFont: 'DM Sans',
  displayFont: 'Fraunces',
};

const LEGACY_TENANT_THEME: TenantTheme = {
  ...DEFAULT_TENANT_THEME,
  primaryColor: '#ff0a78',
  secondaryColor: '#d9005d',
  backgroundColor: '#050505',
  accentColor: '#ff70b5',
  surfaceColor: '#18181b',
  textColor: '#f4f4f5',
  mutedColor: '#a1a1aa',
  borderColor: '#27272a',
  bodyFont: 'Inter',
  displayFont: 'Sora',
};

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const FONT_FAMILY_PATTERN = /^[A-Za-z0-9 ]{1,50}$/;
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isTenantFontFamily(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim().length > 0
    && value === value.trim()
    && FONT_FAMILY_PATTERN.test(value);
}

export function isTenantSubdomain(value: string): boolean {
  return SUBDOMAIN_PATTERN.test(value);
}

export function isTenantTheme(value: unknown): value is TenantTheme {
  if (!value || typeof value !== 'object') return false;

  const theme = value as Partial<TenantTheme>;
  const optionalColors = [
    theme.surfaceColor,
    theme.textColor,
    theme.mutedColor,
    theme.borderColor,
    theme.warmAccentColor,
    theme.softAccentColor,
  ];
  const validLogo = theme.logoUrl === null
    || (typeof theme.logoUrl === 'string'
      && (theme.logoUrl.startsWith('/') && !theme.logoUrl.startsWith('//')
        || /^https:\/\//i.test(theme.logoUrl)));

  return validLogo
    && typeof theme.primaryColor === 'string' && HEX_COLOR_PATTERN.test(theme.primaryColor)
    && typeof theme.secondaryColor === 'string' && HEX_COLOR_PATTERN.test(theme.secondaryColor)
    && typeof theme.backgroundColor === 'string' && HEX_COLOR_PATTERN.test(theme.backgroundColor)
    && typeof theme.accentColor === 'string' && HEX_COLOR_PATTERN.test(theme.accentColor)
    && optionalColors.every((color) => color === undefined || (typeof color === 'string' && HEX_COLOR_PATTERN.test(color)))
    && (theme.bodyFont === undefined || isTenantFontFamily(theme.bodyFont))
    && (theme.displayFont === undefined || isTenantFontFamily(theme.displayFont));
}

export function isTenantFeatures(value: unknown): value is TenantFeatures {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((flag) => typeof flag === 'boolean');
}

export function isTenant(value: unknown): value is Tenant {
  if (!value || typeof value !== 'object') return false;

  const tenant = value as Partial<Tenant>;
  return typeof tenant.id === 'string'
    && typeof tenant.name === 'string'
    && typeof tenant.subdomain === 'string'
    && isTenantSubdomain(tenant.subdomain)
    && (tenant.status === 'ACTIVE' || tenant.status === 'SUSPENDED')
    && isTenantTheme(tenant.theme)
    && isTenantFeatures(tenant.features);
}

export function tenantFromResolverRow(value: unknown): Tenant | null {
  if (!value || typeof value !== 'object') return null;

  const row = value as Record<string, unknown>;
  const storedTheme = row.theme;
  const themeDefaults = row.tenant_subdomain === 'ags' ? DEFAULT_TENANT_THEME : LEGACY_TENANT_THEME;
  const theme = storedTheme && typeof storedTheme === 'object' && !Array.isArray(storedTheme)
    ? { ...themeDefaults, ...(storedTheme as Partial<TenantTheme>) }
    : storedTheme;
  const tenant = {
    id: row.tenant_id,
    name: row.tenant_name,
    subdomain: row.tenant_subdomain,
    status: row.tenant_status,
    theme,
    features: row.features,
  };

  return isTenant(tenant) ? tenant : null;
}
