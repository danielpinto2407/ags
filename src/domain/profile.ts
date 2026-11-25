import type { Tenant } from '@/domain/tenant';
import { getProductRole, isTenantProfileRole, type ProfileRole, type ProfileStatus, type ProductRole } from '@/domain/authorization';

export type { ProfileRole, ProfileStatus, ProductRole } from '@/domain/authorization';

export const COLOMBIA_PHONE_PREFIX = '57';

export function isColombianMobileNumber(value: string): boolean {
  return /^3[0-9]{9}$/.test(value);
}

export function toColombianWhatsappNumber(value: string): string {
  if (!isColombianMobileNumber(value)) throw new Error('Ingresa un celular colombiano de 10 dígitos que empiece por 3.');
  return `${COLOMBIA_PHONE_PREFIX}${value}`;
}

export function getColombianMobileNumber(value: string | null): string | null {
  if (!value) return '';
  const localNumber = value.startsWith(COLOMBIA_PHONE_PREFIX) ? value.slice(COLOMBIA_PHONE_PREFIX.length) : '';
  return isColombianMobileNumber(localNumber) ? localNumber : null;
}

export interface Profile {
  id: string;
  tenant_id: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  full_name: string;
  avatar_path: string | null;
}

export type ProfileAccessResult =
  | { allowed: true; productRole: ProductRole | null }
  | { allowed: false; reason: 'inactive-profile' | 'wrong-tenant' | 'tenant-required' | 'role-not-available' };

export function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false;

  const profile = value as Partial<Profile>;
  const validAvatarPath = profile.avatar_path === null
    || (typeof profile.avatar_path === 'string'
      && profile.avatar_path.startsWith(`avatars/${profile.id}/`)
      && /^avatars\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(profile.avatar_path));
  return typeof profile.id === 'string'
    && (typeof profile.tenant_id === 'string' || profile.tenant_id === null)
    && ['super_admin', 'coach_admin', 'user_personalized', 'user_general'].includes(profile.role ?? '')
    && (profile.status === 'ACTIVE' || profile.status === 'INACTIVE')
    && typeof profile.full_name === 'string'
    && validAvatarPath;
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

  if (!isTenantProfileRole(profile.role)) return { allowed: false, reason: 'role-not-available' };
  if (!tenant) return { allowed: false, reason: 'tenant-required' };
  if (tenant.status !== 'ACTIVE' || profile.tenant_id !== tenant.id) {
    return { allowed: false, reason: 'wrong-tenant' };
  }

  const productRole = getProductRole(profile.role);
  if (!productRole) return { allowed: false, reason: 'role-not-available' };
  return { allowed: true, productRole };
}
