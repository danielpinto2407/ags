import { tenantFromResolverRow, type Tenant } from '@/domain/tenant';
import { isSupabaseConfigured, supabaseClient } from '@/data/supabase/client';

export async function resolveTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  if (!isSupabaseConfigured || !supabaseClient) {
    throw new Error('Supabase no está configurado. Copia .env.example a .env.local y completa la clave publishable local.');
  }

  const { data, error } = await supabaseClient.rpc('resolve_tenant_by_subdomain', {
    p_subdomain: subdomain,
  });

  if (error) {
    throw new Error('No se pudo consultar la configuración del gimnasio.');
  }

  if (!Array.isArray(data)) {
    throw new Error('La respuesta del resolvedor de gimnasios no tiene el formato esperado.');
  }

  if (data.length === 0) return null;
  if (data.length !== 1) {
    throw new Error('La configuración recibida para este gimnasio no es válida.');
  }

  const tenant = tenantFromResolverRow(data[0]);
  if (!tenant) throw new Error('La configuración recibida para este gimnasio no es válida.');
  return tenant;
}
