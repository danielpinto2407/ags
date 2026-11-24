import { useEffect, type CSSProperties, type ReactNode } from 'react';
import LoginScreen from '@/screens/LoginScreen';
import AppShell from '@/app/AppShell';
import ScreenRenderer from '@/app/ScreenRenderer';
import InvitationAcceptanceScreen from '@/screens/InvitationAcceptanceScreen';
import PasswordRecoveryScreen from '@/screens/PasswordRecoveryScreen';
import PlatformEquipmentAdmin from '@/screens/platform/PlatformEquipmentAdmin';
import TenantLoadingIndicator from '@/components/TenantLoadingIndicator';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { useAppNavigation } from '@/app/useAppNavigation';
import { useAuth } from '@/app/session/authContext';
import { DEFAULT_TENANT_THEME, PLATFORM_TENANT_THEME, getTenantThemeCssVariables } from '@/domain/tenant';

const PLATFORM_THEME = PLATFORM_TENANT_THEME;

const tenantThemeStyle = (theme: typeof DEFAULT_TENANT_THEME): CSSProperties => (
  getTenantThemeCssVariables(theme) as CSSProperties
);

function TenantMessage({ title, message, action, loading = false, theme = DEFAULT_TENANT_THEME }: { title: string; message: string; action?: ReactNode; loading?: boolean; theme?: typeof DEFAULT_TENANT_THEME }) {
  return (
    <main className="tenant-app min-h-screen w-full flex items-center justify-center px-6 py-12 text-center" style={tenantThemeStyle(theme)}>
      <section className="max-w-md space-y-3">
        {loading && <TenantLoadingIndicator className="mx-auto" size={28} />}
        <p className="font-display text-xl font-bold text-zinc-900">{title}</p>
        <p className="text-sm leading-relaxed text-zinc-400">{message}</p>
        {action}
      </section>
    </main>
  );
}

export default function App() {
  const {
    state: authState,
    signIn,
    signOut,
    retryProfile,
    requestPasswordRecovery,
    completePasswordRecovery,
    returnToSignIn,
  } = useAuth();
  const { state: tenantState, retry } = useTenantContext();
  const invitationParams = new URLSearchParams(window.location.search);
  const invitationId = invitationParams.get('invitation_id');
  const invitationRole = invitationParams.get('invitation_role');
  const isPasswordRecoveryCallback = new URLSearchParams(window.location.search).get('password_recovery') === '1';
  const role = authState.status === 'authenticated' ? authState.productRole : null;
  const navigation = useAppNavigation(role);
  const fontTheme = tenantState.status === 'tenant'
    ? tenantState.tenant.theme
    : tenantState.status === 'platform'
      ? PLATFORM_THEME
      : DEFAULT_TENANT_THEME;

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
    return <TenantMessage loading title="Cargando gimnasio" message="Estamos preparando tu espacio de entrenamiento." />;
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
    return <TenantMessage title="Servicio pausado" message="Este gimnasio tiene el acceso suspendido. Contacta a la administración para obtener ayuda." theme={tenantState.tenant.theme} />;
  }

  const tenant = tenantState.status === 'tenant' ? tenantState.tenant : null;
  const isPlatform = tenantState.status === 'platform';
  const theme = isPlatform ? PLATFORM_THEME : tenant?.theme ?? DEFAULT_TENANT_THEME;

  if (authState.status === 'unconfigured') {
    return (
      <TenantMessage
        title="Autenticación no configurada"
        message="Configura Supabase local en .env.local para poder iniciar sesión. No uses claves administrativas en el navegador."
        theme={theme}
      />
    );
  }

  if (authState.status === 'loading' || authState.status === 'profile-loading') {
    return <TenantMessage loading title="Verificando sesión" message="Estamos validando tu cuenta y el acceso a este gimnasio." theme={theme} />;
  }

  if (authState.status === 'recovery' || authState.status === 'recovery-complete') {
    const recoveryMode = authState.status === 'recovery' ? 'update' : 'complete';
    return (
      <main className="tenant-app flex min-h-screen w-full items-center justify-center px-5 py-10" style={tenantThemeStyle(theme)}>
        <PasswordRecoveryScreen
          gymName={isPlatform ? 'Administración AGS' : tenant?.name ?? 'GluteHouse'}
          mode={recoveryMode}
          onReturnToSignIn={returnToSignIn}
          onUpdate={completePasswordRecovery}
        />
      </main>
    );
  }

  if (isPasswordRecoveryCallback && authState.status !== 'authenticated') {
    return (
      <main className="tenant-app flex min-h-screen w-full items-center justify-center px-5 py-10" style={tenantThemeStyle(theme)}>
        <PasswordRecoveryScreen
          gymName={isPlatform ? 'Administración AGS' : tenant?.name ?? 'GluteHouse'}
          mode="invalid"
          onReturnToSignIn={returnToSignIn}
        />
      </main>
    );
  }

  if (authState.status === 'error') {
    return (
      <TenantMessage
        title={authState.message.includes('sesión') ? 'No se pudo validar la sesión' : 'No se pudo verificar el perfil'}
        message={authState.message}
        theme={theme}
        action={(
          <button onClick={retryProfile} className="mt-3 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-action-hover">
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
            acceptanceKind={invitationRole === 'coach_admin' ? 'coach_admin' : 'personalized_member'}
            onAccepted={retryProfile}
          />
        </div>
      );
    }

    return (
      <TenantMessage
        title="Acceso no disponible"
        message={authState.message}
        theme={theme}
        action={(
          <button onClick={signOut} className="mt-3 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
            Cerrar sesión
          </button>
        )}
      />
    );
  }

  if (authState.status === 'authenticated' && authState.profile.role === 'super_admin') {
    return <PlatformEquipmentAdmin profile={authState.profile} onLogout={signOut} />;
  }

  if (isPlatform && authState.status === 'authenticated') {
    return (
      <TenantMessage
        title="Acceso no disponible"
        message="Esta cuenta no tiene permisos de superadministrador para la plataforma."
        theme={theme}
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
          tenantName={isPlatform ? 'Administración AGS' : tenant?.name ?? 'GluteHouse'}
          description={isPlatform ? 'Acceso exclusivo para superadministradores de la plataforma.' : tenant?.description ?? ''}
          logoUrl={tenant?.theme.logoUrl ?? null}
          error={authState.status === 'signed-out' ? authState.error : null}
          isSubmitting={authState.status === 'signed-out' && authState.submitting}
          onSubmit={signIn}
          onRequestPasswordRecovery={requestPasswordRecovery}
          onCancelPasswordRecovery={returnToSignIn}
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
