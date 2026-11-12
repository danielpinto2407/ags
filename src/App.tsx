import { useEffect, type CSSProperties, type ReactNode } from 'react';
import LoginScreen from '@/screens/LoginScreen';
import AppShell from '@/app/AppShell';
import ScreenRenderer from '@/app/ScreenRenderer';
import InvitationAcceptanceScreen from '@/screens/InvitationAcceptanceScreen';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { useAppNavigation } from '@/app/useAppNavigation';
import { useAuth } from '@/app/session/authContext';
import { DEFAULT_TENANT_THEME } from '@/domain/tenant';

const tenantThemeStyle = (theme: typeof DEFAULT_TENANT_THEME): CSSProperties => ({
  '--tenant-primary': theme.primaryColor,
  '--tenant-secondary': theme.secondaryColor,
  '--tenant-background': theme.backgroundColor,
  '--tenant-accent': theme.accentColor,
  '--tenant-surface': theme.surfaceColor,
  '--tenant-text': theme.textColor,
  '--tenant-muted': theme.mutedColor,
  '--tenant-border': theme.borderColor,
  '--tenant-warm-accent': theme.warmAccentColor,
  '--tenant-soft-accent': theme.softAccentColor,
  '--tenant-body-font': `"${theme.bodyFont}"`,
  '--tenant-display-font': `"${theme.displayFont}"`,
} as CSSProperties);

function TenantMessage({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <main className="tenant-app min-h-screen w-full flex items-center justify-center px-6 py-12 text-center">
      <section className="max-w-md space-y-3">
        <p className="font-display text-xl font-bold text-zinc-900">{title}</p>
        <p className="text-sm leading-relaxed text-zinc-400">{message}</p>
        {action}
      </section>
    </main>
  );
}

export default function App() {
  const { state: authState, signIn, signOut, retryProfile } = useAuth();
  const { state: tenantState, retry } = useTenantContext();
  const invitationId = new URLSearchParams(window.location.search).get('invitation_id');
  const role = authState.status === 'authenticated' ? authState.productRole : null;
  const navigation = useAppNavigation(role);
  const fontTheme = tenantState.status === 'tenant' ? tenantState.tenant.theme : DEFAULT_TENANT_THEME;

  useEffect(() => {
    const families = [
      `${fontTheme.bodyFont}:wght@400;500;600;700`,
      `${fontTheme.displayFont}:wght@600;700`,
    ];
    const href = `https://fonts.googleapis.com/css2?${families.map((family) => `family=${encodeURIComponent(family)}`).join('&')}&display=swap`;
    let fontLink = document.querySelector<HTMLLinkElement>('#tenant-fonts');

    if (!fontLink) {
      fontLink = document.createElement('link');
      fontLink.id = 'tenant-fonts';
      fontLink.rel = 'stylesheet';
      document.head.append(fontLink);
    }

    fontLink.href = href;
  }, [fontTheme.bodyFont, fontTheme.displayFont]);

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

  if (authState.status === 'unconfigured') {
    return (
      <TenantMessage
        title="Autenticación no configurada"
        message="Configura Supabase local en .env.local para poder iniciar sesión. No uses claves administrativas en el navegador."
      />
    );
  }

  if (authState.status === 'loading' || authState.status === 'profile-loading') {
    return <TenantMessage title="Verificando sesión" message="Estamos validando tu cuenta y el acceso a este gimnasio." />;
  }

  if (authState.status === 'error') {
    return (
      <TenantMessage
        title={authState.message.includes('sesión') ? 'No se pudo validar la sesión' : 'No se pudo verificar el perfil'}
        message={authState.message}
        action={(
          <button onClick={retryProfile} className="mt-3 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500">
            Reintentar
          </button>
        )}
      />
    );
  }

  if (authState.status === 'blocked') {
    if (invitationId && authState.message.includes('todavía no tiene un perfil asignado')) {
      return (
        <div className="tenant-app min-h-screen w-full" style={tenantThemeStyle(theme)}>
          <InvitationAcceptanceScreen
            invitationId={invitationId}
            gymName={tenant?.name ?? 'GluteHouse'}
            onAccepted={retryProfile}
          />
        </div>
      );
    }

    return (
      <TenantMessage
        title="Acceso no disponible"
        message={authState.message}
        action={(
          <button onClick={signOut} className="mt-3 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
            Cerrar sesión
          </button>
        )}
      />
    );
  }

  if (authState.status === 'authenticated' && authState.productRole === null) {
    return (
      <TenantMessage
        title="Panel de plataforma en preparación"
        message={`Hola ${authState.profile.full_name}. Tu cuenta de superadministración está autenticada, pero el panel global todavía no está disponible.`}
        action={(
          <button onClick={signOut} className="mt-3 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
            Cerrar sesión
          </button>
        )}
      />
    );
  }

  if (!role) {
    return (
      <div className="tenant-app min-h-screen w-full" style={tenantThemeStyle(theme)}>
        <LoginScreen
          tenantName={tenant?.name ?? 'GluteHouse'}
          logoUrl={tenant?.theme.logoUrl ?? null}
          error={authState.status === 'signed-out' ? authState.error : null}
          isSubmitting={authState.status === 'signed-out' && authState.submitting}
          onSubmit={signIn}
        />
      </div>
    );
  }

  return (
    <div className="tenant-app min-h-screen w-full" style={tenantThemeStyle(theme)}>
      {role && (
        <AppShell navigation={navigation}>
          {authState.status === 'authenticated' && (
            <ScreenRenderer navigation={navigation} profile={authState.profile} onLogout={signOut} />
          )}
        </AppShell>
      )}
    </div>
  );
}
