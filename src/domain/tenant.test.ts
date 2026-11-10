import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TENANT_THEME,
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

  it('rejects malformed rows from the SQL RPC', () => {
    expect(tenantFromResolverRow({ tenant_id: 'bad', tenant_status: 'PAUSED' })).toBeNull();
  });

  it('rejects unknown tenant states or malformed slugs', () => {
    expect(isTenant({ ...validTenant, status: 'PAUSED' })).toBe(false);
    expect(isTenant({ ...validTenant, subdomain: 'ags.eu' })).toBe(false);
  });
});
