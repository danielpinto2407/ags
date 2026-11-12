import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TENANT_THEME,
  isTenantFontFamily,
  isTenant,
  isTenantFeatures,
  isTenantTheme,
  tenantFromResolverRow,
} from '@/domain/tenant';

const validTenant = {
  id: 'tenant-ags',
  name: 'AGS GluteHouse',
  subdomain: 'ags',
  status: 'ACTIVE',
  theme: DEFAULT_TENANT_THEME,
  features: { personalizedRoutines: true, groupClasses: false },
};

describe('tenant payload validation', () => {
  it('accepts the configured fallback theme', () => {
    expect(isTenantTheme(DEFAULT_TENANT_THEME)).toBe(true);
  });

  it('accepts font family names from the database and rejects CSS injection', () => {
    expect(isTenantFontFamily('DM Sans')).toBe(true);
    expect(isTenantFontFamily('Playfair Display')).toBe(true);
    expect(isTenantFontFamily('Fraunces; color:red')).toBe(false);
    expect(isTenantFontFamily('  ')).toBe(false);
  });

  it('rejects invalid colors and arbitrary CSS values', () => {
    expect(isTenantTheme({ ...DEFAULT_TENANT_THEME, primaryColor: 'red' })).toBe(false);
    expect(isTenantTheme({ ...DEFAULT_TENANT_THEME, backgroundColor: 'url(javascript:alert(1))' })).toBe(false);
  });

  it('allows only HTTPS or same-origin path logo URLs', () => {
    expect(isTenantTheme({ ...DEFAULT_TENANT_THEME, logoUrl: 'https://cdn.example.com/logo.png' })).toBe(true);
    expect(isTenantTheme({ ...DEFAULT_TENANT_THEME, logoUrl: '/logos/ags.png' })).toBe(true);
    expect(isTenantTheme({ ...DEFAULT_TENANT_THEME, logoUrl: '//evil.example/logo.png' })).toBe(false);
    expect(isTenantTheme({ ...DEFAULT_TENANT_THEME, logoUrl: 'javascript:alert(1)' })).toBe(false);
  });

  it('accepts only boolean feature flags', () => {
    expect(isTenantFeatures({ personalizedRoutines: true, groupClasses: false })).toBe(true);
    expect(isTenantFeatures({ groupClasses: 'yes' })).toBe(false);
    expect(isTenantFeatures([])).toBe(false);
  });

  it('accepts a fully validated tenant response', () => {
    expect(isTenant(validTenant)).toBe(true);
  });

  it('maps and validates the SQL RPC column names', () => {
    expect(tenantFromResolverRow({
      tenant_id: validTenant.id,
      tenant_name: validTenant.name,
      tenant_subdomain: validTenant.subdomain,
      tenant_status: validTenant.status,
      theme: validTenant.theme,
      features: validTenant.features,
    })).toEqual(validTenant);
  });

  it('preserves font family names provided by the tenant database', () => {
    const tenant = tenantFromResolverRow({
      tenant_id: validTenant.id,
      tenant_name: validTenant.name,
      tenant_subdomain: validTenant.subdomain,
      tenant_status: validTenant.status,
      theme: { ...DEFAULT_TENANT_THEME, bodyFont: 'Roboto', displayFont: 'Playfair Display' },
      features: validTenant.features,
    });

    expect(tenant?.theme.bodyFont).toBe('Roboto');
    expect(tenant?.theme.displayFont).toBe('Playfair Display');
  });

  it('fills configured defaults when an older tenant theme has only the original colors', () => {
    const tenant = tenantFromResolverRow({
      tenant_id: validTenant.id,
      tenant_name: validTenant.name,
      tenant_subdomain: validTenant.subdomain,
      tenant_status: validTenant.status,
      theme: {
        logoUrl: null,
        primaryColor: '#ff0a78',
        secondaryColor: '#d9005d',
        backgroundColor: '#050505',
        accentColor: '#ff70b5',
      },
      features: validTenant.features,
    });

    expect(tenant?.theme.surfaceColor).toBe(DEFAULT_TENANT_THEME.surfaceColor);
    expect(tenant?.theme.primaryColor).toBe('#ff0a78');
  });

  it('keeps legacy dark defaults for tenants other than AGS', () => {
    const tenant = tenantFromResolverRow({
      tenant_id: 'tenant-legacy',
      tenant_name: 'Legacy Gym',
      tenant_subdomain: 'legacygym',
      tenant_status: 'ACTIVE',
      theme: {
        logoUrl: null,
        primaryColor: '#ff0a78',
        secondaryColor: '#d9005d',
        backgroundColor: '#050505',
        accentColor: '#ff70b5',
      },
      features: {},
    });

    expect(tenant?.theme.surfaceColor).toBe('#18181b');
    expect(tenant?.theme.textColor).toBe('#f4f4f5');
  });

  it('rejects malformed rows from the SQL RPC', () => {
    expect(tenantFromResolverRow({ tenant_id: 'bad', tenant_status: 'PAUSED' })).toBeNull();
  });

  it('rejects unknown tenant states or malformed slugs', () => {
    expect(isTenant({ ...validTenant, status: 'PAUSED' })).toBe(false);
    expect(isTenant({ ...validTenant, subdomain: 'ags.eu' })).toBe(false);
  });
});
