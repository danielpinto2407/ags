import { createContext, useContext } from 'react';
import type { Tenant } from '@/domain/tenant';

export type TenantBootstrapState =
  | { status: 'loading' }
  | { status: 'platform' }
  | { status: 'tenant'; tenant: Tenant }
  | { status: 'not-found'; subdomain: string }
  | { status: 'error'; message: string };

export interface TenantContextValue {
  state: TenantBootstrapState;
  retry: () => void;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenantContext(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenantContext debe usarse dentro de TenantProvider.');
  return context;
}
