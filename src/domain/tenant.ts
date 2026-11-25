export type TenantStatus = 'ACTIVE' | 'SUSPENDED';

function srgbChannelToLinear(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hexColor: string): number {
  const hex = /^#[0-9A-Fa-f]{6}$/.test(hexColor) ? hexColor.slice(1) : '71717A';
  const red = srgbChannelToLinear(parseInt(hex.slice(0, 2), 16));
  const green = srgbChannelToLinear(parseInt(hex.slice(2, 4), 16));
  const blue = srgbChannelToLinear(parseInt(hex.slice(4, 6), 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function getContrastingTextColor(hexColor: string): string {
  const background = relativeLuminance(hexColor);
  const whiteContrast = 1.05 / (background + 0.05);
  const darkContrast = (background + 0.05) / (0.06 + 0.05);
  return whiteContrast >= darkContrast ? '#FFFFFF' : '#18181B';
}

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

export type TenantThemeCssVariables = Record<string, string>;

export function getTenantThemeCssVariables(theme: TenantTheme): TenantThemeCssVariables {
  return {
    '--tenant-primary': theme.primaryColor,
    '--tenant-primary-hover': `color-mix(in srgb, ${theme.primaryColor} 82%, #000000)`,
    '--tenant-primary-active': `color-mix(in srgb, ${theme.primaryColor} 72%, #000000)`,
    '--tenant-on-primary': getContrastingTextColor(theme.primaryColor),
    '--tenant-secondary': theme.secondaryColor,
    '--tenant-on-secondary': getContrastingTextColor(theme.secondaryColor),
    '--tenant-secondary-hover': `color-mix(in srgb, ${theme.secondaryColor} 82%, #000000)`,
    '--tenant-background': theme.backgroundColor,
    '--tenant-accent': theme.accentColor,
    '--tenant-surface': theme.surfaceColor,
    '--tenant-text': theme.textColor,
    '--tenant-muted': theme.mutedColor,
    '--tenant-border': theme.borderColor,
    '--tenant-warm-accent': theme.warmAccentColor,
    '--tenant-soft-accent': theme.softAccentColor,
    '--tenant-control-hover': `color-mix(in srgb, ${theme.accentColor} 24%, ${theme.surfaceColor})`,
    '--tenant-danger': '#b42318',
    '--tenant-on-danger': '#FFFFFF',
    '--tenant-body-font': `"${theme.bodyFont}"`,
    '--tenant-display-font': `"${theme.displayFont}"`,
  };
}

export type TenantFeatures = Record<string, boolean>;

export interface Tenant {
  id: string;
  name: string;
  description: string;
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

export const PLATFORM_TENANT_THEME: TenantTheme = {
  ...DEFAULT_TENANT_THEME,
  primaryColor: '#71717A',
  secondaryColor: '#52525B',
  backgroundColor: '#09090B',
  accentColor: '#A1A1AA',
  surfaceColor: '#18181B',
  textColor: '#FAFAFA',
  mutedColor: '#A1A1AA',
  borderColor: '#27272A',
  warmAccentColor: '#A1A1AA',
  softAccentColor: '#52525B',
  bodyFont: 'DM Sans',
  displayFont: 'DM Sans',
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
    && typeof tenant.description === 'string'
    && tenant.description.length <= 280
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
  const storedThemeWithoutLoadingIcon = storedTheme && typeof storedTheme === 'object' && !Array.isArray(storedTheme)
    ? Object.fromEntries(Object.entries(storedTheme).filter(([key]) => key !== 'loadingIconUrl'))
    : storedTheme;
  const theme = storedThemeWithoutLoadingIcon && typeof storedThemeWithoutLoadingIcon === 'object' && !Array.isArray(storedThemeWithoutLoadingIcon)
    ? { ...themeDefaults, ...(storedThemeWithoutLoadingIcon as Partial<TenantTheme>) }
    : storedThemeWithoutLoadingIcon;
  const tenant = {
    id: row.tenant_id,
    name: row.tenant_name,
    description: row.tenant_description,
    subdomain: row.tenant_subdomain,
    status: row.tenant_status,
    theme,
    features: row.features,
  };

  return isTenant(tenant) ? tenant : null;
}
