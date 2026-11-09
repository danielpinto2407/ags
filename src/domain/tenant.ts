export type TenantStatus = 'ACTIVE' | 'SUSPENDED';

export interface TenantTheme {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  accentColor: string;
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
  primaryColor: '#ff0a78',
  secondaryColor: '#d9005d',
  backgroundColor: '#050505',
  accentColor: '#ff70b5',
};

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isTenantSubdomain(value: string): boolean {
  return SUBDOMAIN_PATTERN.test(value);
}

export function isTenantTheme(value: unknown): value is TenantTheme {
  if (!value || typeof value !== 'object') return false;

  const theme = value as Partial<TenantTheme>;
  const validLogo = theme.logoUrl === null
    || (typeof theme.logoUrl === 'string'
      && (theme.logoUrl.startsWith('/') && !theme.logoUrl.startsWith('//')
        || /^https:\/\//i.test(theme.logoUrl)));

  return validLogo
    && typeof theme.primaryColor === 'string' && HEX_COLOR_PATTERN.test(theme.primaryColor)
    && typeof theme.secondaryColor === 'string' && HEX_COLOR_PATTERN.test(theme.secondaryColor)
    && typeof theme.backgroundColor === 'string' && HEX_COLOR_PATTERN.test(theme.backgroundColor)
    && typeof theme.accentColor === 'string' && HEX_COLOR_PATTERN.test(theme.accentColor);
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
  const tenant = {
    id: row.tenant_id,
    name: row.tenant_name,
    subdomain: row.tenant_subdomain,
    status: row.tenant_status,
    theme: row.theme,
    features: row.features,
  };

  return isTenant(tenant) ? tenant : null;
}
