import type { CSSProperties, ReactNode } from 'react';
import LoginScreen from '@/screens/LoginScreen';
import AppShell from '@/app/AppShell';
import ScreenRenderer from '@/app/ScreenRenderer';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { useAppNavigation } from '@/app/useAppNavigation';
import { DEFAULT_TENANT_THEME } from '@/domain/tenant';

const tenantThemeStyle = (theme: typeof DEFAULT_TENANT_THEME): CSSProperties => ({
  '--tenant-primary': theme.primaryColor,
  '--tenant-secondary': theme.secondaryColor,
  '--tenant-background': theme.backgroundColor,
  '--tenant-accent': theme.accentColor,
} as CSSProperties);

function TenantMessage({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <main className="tenant-app min-h-screen w-full flex items-center justify-center px-6 py-12 text-center">
      <section className="max-w-md space-y-3">
        <p className="font-display text-xl font-bold text-white">{title}</p>
        <p className="text-sm leading-relaxed text-zinc-400">{message}</p>
        {action}
      </section>
    </main>
  );
}

export default function App() {
  const navigation = useAppNavigation();
  const { role, handleLogin } = navigation;
  const { state: tenantState, retry } = useTenantContext();

  if (tenantState.status === 'loading') {
    return <TenantMessage title="Cargando gimnasio" message="Estamos preparando tu espacio de entrenamiento." />;
  }

  if (tenantState.status === 'error') {
    return (
      <TenantMessage
        title="No se pudo cargar el gimnasio"
        message={tenantState.message}
        action={(
          <button onClick={retry} className="mt-3 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500">
            Reintentar
          </button>
        )}
      />
    );
  }

  if (tenantState.status === 'not-found') {
    return <TenantMessage title="Gimnasio no encontrado" message={`No encontramos un gimnasio registrado para “${tenantState.subdomain}”. Revisa la dirección e inténtalo de nuevo.`} />;
  }

  if (tenantState.status === 'tenant' && tenantState.tenant.status === 'SUSPENDED') {
    return <TenantMessage title="Servicio pausado" message="Este gimnasio tiene el acceso suspendido. Contacta a la administración para obtener ayuda." />;
  }

  const tenant = tenantState.status === 'tenant' ? tenantState.tenant : null;
  const theme = tenant?.theme ?? DEFAULT_TENANT_THEME;

  if (!role) {
    return (
      <div className="tenant-app min-h-screen w-full" style={tenantThemeStyle(theme)}>
        <LoginScreen
          onLogin={handleLogin}
          tenantName={tenant?.name ?? 'GluteHouse'}
          logoUrl={tenant?.theme.logoUrl ?? null}
        />
      </div>
    );
  }

  return (
    <div className="tenant-app min-h-screen w-full" style={tenantThemeStyle(theme)}>
      <AppShell navigation={navigation}>
        <ScreenRenderer navigation={navigation} />
      </AppShell>
    </div>
  );
}
