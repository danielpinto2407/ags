import type { Tenant } from '@/domain/tenant';

export type ProfileRole = 'super_admin' | 'coach_admin' | 'user_personalized' | 'user_general';
export type ProfileStatus = 'ACTIVE' | 'INACTIVE';
export type ProductRole = 'student' | 'coach';

export interface Profile {
  id: string;
  tenant_id: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  full_name: string;
}

export type ProfileAccessResult =
  | { allowed: true; productRole: ProductRole | null }
  | { allowed: false; reason: 'inactive-profile' | 'wrong-tenant' | 'tenant-required' | 'role-not-available' };

export function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false;

  const profile = value as Partial<Profile>;
  return typeof profile.id === 'string'
    && (typeof profile.tenant_id === 'string' || profile.tenant_id === null)
    && ['super_admin', 'coach_admin', 'user_personalized', 'user_general'].includes(profile.role ?? '')
    && (profile.status === 'ACTIVE' || profile.status === 'INACTIVE')
    && typeof profile.full_name === 'string';
}

export function resolveProfileAccess(
  profile: Profile,
  tenant: Tenant | null
): ProfileAccessResult {
  if (profile.status !== 'ACTIVE') return { allowed: false, reason: 'inactive-profile' };

  if (profile.role === 'super_admin') {
    if (profile.tenant_id !== null || tenant !== null) {
      return { allowed: false, reason: 'wrong-tenant' };
    }
    return { allowed: true, productRole: null };
  }

  if (!tenant) return { allowed: false, reason: 'tenant-required' };
  if (tenant.status !== 'ACTIVE' || profile.tenant_id !== tenant.id) {
    return { allowed: false, reason: 'wrong-tenant' };
  }

  if (profile.role === 'coach_admin') return { allowed: true, productRole: 'coach' };
  if (profile.role === 'user_personalized') return { allowed: true, productRole: 'student' };
  return { allowed: false, reason: 'role-not-available' };
}
