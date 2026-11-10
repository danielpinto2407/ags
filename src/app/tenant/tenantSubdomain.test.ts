import { describe, expect, it } from 'vitest';
import { getTenantSubdomain } from '@/app/tenant/tenantSubdomain';

describe('getTenantSubdomain', () => {
  const rootDomain = 'tugimnasioapp.com';

  it('uses the configured default tenant on localhost', () => {
    expect(getTenantSubdomain('localhost', rootDomain, 'ags')).toBe('ags');
  });

  it('maps only the explicitly configured Vercel preview host to its tenant', () => {
    expect(getTenantSubdomain(
      'ags-roan-iota.vercel.app',
      rootDomain,
      'ags',
      'ags-roan-iota.vercel.app'
    )).toBe('ags');
  });

  it('does not apply the Vercel preview tenant mapping to a different host', () => {
    expect(getTenantSubdomain(
      'another-project.vercel.app',
      rootDomain,
      'ags',
      'ags-roan-iota.vercel.app'
    )).toBeNull();
  });

  it('reads a tenant slug from a local subdomain', () => {
    expect(getTenantSubdomain('ags.localhost', rootDomain, '')).toBe('ags');
  });

  it('does not interpret multi-level localhost names as one tenant', () => {
    expect(getTenantSubdomain('foo.ags.localhost', rootDomain, '')).toBeNull();
  });

  it('uses one valid production subdomain', () => {
    expect(getTenantSubdomain('PowerGym.tugimnasioapp.com', rootDomain, '')).toBe('powergym');
  });

  it.each(['tugimnasioapp.com', 'www.tugimnasioapp.com', 'app.tugimnasioapp.com', 'admin.tugimnasioapp.com'])(
    'uses the neutral platform context for reserved host %s',
    (hostname) => {
      expect(getTenantSubdomain(hostname, rootDomain, '')).toBeNull();
    }
  );

  it.each([
    'bad_label.tugimnasioapp.com',
    'foo.bar.tugimnasioapp.com',
    '-invalid.tugimnasioapp.com',
    'powergym.otherdomain.com',
  ])('rejects malformed or unrelated host %s', (hostname) => {
    expect(getTenantSubdomain(hostname, rootDomain, '')).toBeNull();
  });
});
