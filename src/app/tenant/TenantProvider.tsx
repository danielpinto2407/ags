import { useEffect, useState, type ReactNode } from 'react';
import { resolveTenantBySubdomain } from '@/data/tenantRepository';
import { TenantContext, type TenantBootstrapState } from '@/app/tenant/tenantContext';
import { getTenantSubdomain } from '@/app/tenant/tenantSubdomain';

interface TenantProviderProps {
  children: ReactNode;
}

const rootDomain = import.meta.env.VITE_ROOT_DOMAIN ?? '';
const localDefaultSubdomain = import.meta.env.VITE_DEFAULT_TENANT_SUBDOMAIN ?? '';

export function TenantProvider({ children }: TenantProviderProps) {
  const subdomain = getTenantSubdomain(window.location.hostname, rootDomain, localDefaultSubdomain);
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

  return (
    <TenantContext.Provider value={{ state, retry }}>
      {children}
    </TenantContext.Provider>
  );
}
