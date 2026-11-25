import { useEffect, useState, type ReactNode } from 'react';
import { resolveTenantBySubdomain } from '@/data/tenantRepository';
import { TenantContext, type TenantBootstrapState } from '@/app/tenant/tenantContext';
import { getTenantSubdomain, isPlatformPath } from '@/app/tenant/tenantSubdomain';

interface TenantProviderProps {
  children: ReactNode;
}

const rootDomain = import.meta.env.VITE_ROOT_DOMAIN ?? '';
const localDefaultSubdomain = import.meta.env.VITE_DEFAULT_TENANT_SUBDOMAIN ?? '';
const previewTenantHostname = import.meta.env.VITE_PREVIEW_TENANT_HOSTNAME ?? '';

export function TenantProvider({ children }: TenantProviderProps) {
  const subdomain = isPlatformPath(window.location.pathname)
    ? null
    : getTenantSubdomain(
      window.location.hostname,
      rootDomain,
      localDefaultSubdomain,
      previewTenantHostname
    );
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<TenantBootstrapState>(() => (
    subdomain ? { status: 'loading' } : { status: 'platform' }
  ));

  useEffect(() => {
    if (!subdomain) return;

    let cancelled = false;
    resolveTenantBySubdomain(subdomain)
      .then((tenant) => {
        if (cancelled) return;
        setState(tenant ? { status: 'tenant', tenant } : { status: 'not-found', subdomain });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: error instanceof Error
            ? error.message
            : 'No se pudo cargar la configuración del gimnasio.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, subdomain]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((currentAttempt) => currentAttempt + 1);
  };

  const refresh = async () => {
    if (!subdomain) return;
    try {
      const tenant = await resolveTenantBySubdomain(subdomain);
      setState((current) => tenant
        ? { status: 'tenant', tenant }
        : current.status === 'tenant'
          ? current
          : { status: 'not-found', subdomain });
    } catch {
      setState((current) => current.status === 'tenant' ? current : { status: 'error', message: 'No se pudo actualizar la configuración del gimnasio.' });
    }
  };

  return (
    <TenantContext.Provider value={{ state, retry, refresh }}>
      {children}
    </TenantContext.Provider>
  );
}
