import { isTenantSubdomain } from '@/domain/tenant';

export function getTenantSubdomain(
  hostname: string,
  rootDomain: string,
  localDefaultSubdomain: string
): string | null {
  const normalizedHost = hostname.trim().toLowerCase().replace(/\.$/, '');
  const normalizedRoot = rootDomain.trim().toLowerCase().replace(/^\*\./, '').replace(/\.$/, '');
  const defaultSubdomain = localDefaultSubdomain.trim().toLowerCase();

  if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' || normalizedHost === '::1') {
    return isTenantSubdomain(defaultSubdomain) ? defaultSubdomain : null;
  }

  if (normalizedHost.endsWith('.localhost')) {
    const localSubdomain = normalizedHost.slice(0, -'.localhost'.length);
    return !localSubdomain.includes('.') && isTenantSubdomain(localSubdomain)
      ? localSubdomain
      : null;
  }

  if (!normalizedRoot || normalizedHost === normalizedRoot) return null;
  if (['www', 'app', 'admin'].some((prefix) => normalizedHost === `${prefix}.${normalizedRoot}`)) {
    return null;
  }

  const rootSuffix = `.${normalizedRoot}`;
  if (!normalizedHost.endsWith(rootSuffix)) return null;

  const subdomain = normalizedHost.slice(0, -rootSuffix.length);
  return !subdomain.includes('.') && isTenantSubdomain(subdomain) ? subdomain : null;
}
