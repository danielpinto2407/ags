import { describe, expect, it } from 'vitest';
import { DEFAULT_TENANT_THEME, type Tenant } from '@/domain/tenant';
import { isProfile, resolveProfileAccess, type Profile } from '@/domain/profile';

const activeTenant: Tenant = {
  id: 'tenant-ags',
  name: 'AGS GluteHouse',
  subdomain: 'ags',
  status: 'ACTIVE',
  theme: {
    ...DEFAULT_TENANT_THEME,
    logoUrl: null,
    primaryColor: '#ff0a78',
    secondaryColor: '#d9005d',
    backgroundColor: '#050505',
    accentColor: '#ff70b5',
  },
  features: { personalizedRoutines: true },
};

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'profile-1',
  tenant_id: activeTenant.id,
  role: 'user_personalized',
  status: 'ACTIVE',
  full_name: 'Laura Gomez',
  avatar_path: null,
  ...overrides,
});

describe('profile access rules', () => {
  it('validates a profile payload', () => {
    expect(isProfile(profile())).toBe(true);
    expect(isProfile(profile({
      id: '00000000-0000-4000-8000-000000000001',
      avatar_path: 'avatars/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.png',
    }))).toBe(true);
    expect(isProfile(profile({ avatar_path: 'https://example.test/avatar.png' }))).toBe(false);
    expect(isProfile({ ...profile(), role: 'owner' })).toBe(false);
    expect(isProfile({ ...profile(), tenant_id: 42 })).toBe(false);
  });

  it('allows a personalized student only in the matching active tenant', () => {
    expect(resolveProfileAccess(profile(), activeTenant)).toEqual({
      allowed: true,
      productRole: 'student',
    });
    expect(resolveProfileAccess(profile({ tenant_id: 'another-tenant' }), activeTenant)).toEqual({
      allowed: false,
      reason: 'wrong-tenant',
    });
  });

  it('maps coach_admin to coach UI role', () => {
    expect(resolveProfileAccess(profile({ role: 'coach_admin' }), activeTenant)).toEqual({
      allowed: true,
      productRole: 'coach',
    });
  });

  it('blocks inactive profiles before granting any product role', () => {
    expect(resolveProfileAccess(profile({ status: 'INACTIVE' }), activeTenant)).toEqual({
      allowed: false,
      reason: 'inactive-profile',
    });
  });

  it('requires a tenant for tenant-scoped users', () => {
    expect(resolveProfileAccess(profile(), null)).toEqual({
      allowed: false,
      reason: 'tenant-required',
    });
  });

  it('blocks all tenant roles when the resolved tenant is suspended', () => {
    expect(resolveProfileAccess(profile(), { ...activeTenant, status: 'SUSPENDED' })).toEqual({
      allowed: false,
      reason: 'wrong-tenant',
    });
  });

  it('keeps super admins platform-scoped and does not map them to coach/student UI', () => {
    expect(resolveProfileAccess(profile({ role: 'super_admin', tenant_id: null }), null)).toEqual({
      allowed: true,
      productRole: null,
    });
    expect(resolveProfileAccess(profile({ role: 'super_admin', tenant_id: null }), activeTenant)).toEqual({
      allowed: false,
      reason: 'wrong-tenant',
    });
  });

  it('does not expose the future group-class role in the current UI', () => {
    expect(resolveProfileAccess(profile({ role: 'user_general' }), activeTenant)).toEqual({
      allowed: false,
      reason: 'role-not-available',
    });
  });
});
