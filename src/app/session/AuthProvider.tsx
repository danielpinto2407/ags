import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { authRepository } from '@/data/authRepository';
import { resolveProfileAccess } from '@/domain/profile';
import { resolveTenantBySubdomain } from '@/data/tenantRepository';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { AuthContext, type AuthState } from '@/app/session/authContext';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { state: tenantState } = useTenantContext();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [bootstrapComplete, setBootstrapComplete] = useState(false);
  const [authState, setAuthState] = useState<AuthState>(() => (
    authRepository.isConfigured()
      ? { status: 'loading' }
      : { status: 'unconfigured' }
  ));
  const sessionUserId = session?.user.id ?? null;

  useEffect(() => {
    if (!authRepository.isConfigured()) {
      setAuthState({ status: 'unconfigured' });
      setSessionReady(true);
      return;
    }

    let cancelled = false;
    const unsubscribe = authRepository.subscribeToAuthChanges((_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      setSessionReady(true);
      setSessionError(false);
      if (!nextSession) setAuthState({ status: 'signed-out', error: null, submitting: false });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authRepository.isConfigured()) return;
    let cancelled = false;
    setSessionReady(false);
    setSessionError(false);
    setBootstrapComplete(false);

    authRepository.getSession()
      .then(({ session: currentSession }) => {
        if (cancelled) return;
        setSession(currentSession);
        setSessionReady(true);
        setBootstrapComplete(true);
      })
      .catch(() => {
        if (cancelled) return;
        setSessionError(true);
        setSessionReady(true);
        setBootstrapComplete(true);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!authRepository.isConfigured()) {
      setAuthState({ status: 'unconfigured' });
      return;
    }
    if (!sessionReady || !bootstrapComplete) {
      setAuthState({ status: 'loading' });
      return;
    }
    if (sessionError) {
      setAuthState({ status: 'error', message: 'No se pudo recuperar la sesión. Inténtalo nuevamente.' });
      return;
    }
    if (!sessionUserId) {
      setAuthState((currentState) => currentState.status === 'signed-out'
        ? currentState
        : { status: 'signed-out', error: null, submitting: false });
      return;
    }
    if (tenantState.status === 'loading' || tenantState.status === 'error' || tenantState.status === 'not-found') {
      setAuthState({ status: 'profile-loading' });
      return;
    }

    let cancelled = false;
    setAuthState({ status: 'profile-loading' });

    const loadProfile = async () => {
      const user = await authRepository.getVerifiedUser(sessionUserId);
      if (cancelled) return;

      let tenant = tenantState.status === 'tenant' ? tenantState.tenant : null;
      if (tenant) {
        tenant = await resolveTenantBySubdomain(tenant.subdomain);
        if (cancelled) return;
        if (!tenant || tenant.status === 'SUSPENDED') {
          setAuthState({
            status: 'blocked',
            message: 'Este gimnasio está suspendido. Contacta a la administración para obtener ayuda.',
          });
          return;
        }
      }

      const profile = await authRepository.getOwnProfile(user.id);
      if (cancelled) return;

      if (!profile) {
        setAuthState({
          status: 'blocked',
          message: 'Esta cuenta todavía no tiene un perfil asignado. Contacta a la administración del gimnasio.',
        });
        return;
      }

      const access = resolveProfileAccess(profile, tenant);
      if (!access.allowed) {
        const messages = {
          'inactive-profile': 'Tu membresía está inactiva. Contacta a la administración de tu gimnasio.',
          'wrong-tenant': 'Esta cuenta no pertenece al gimnasio de esta dirección.',
          'tenant-required': 'Accede desde la dirección de tu gimnasio para continuar.',
          'role-not-available': 'Este tipo de cuenta todavía no está disponible en la aplicación.',
        } as const;
        setAuthState({ status: 'blocked', message: messages[access.reason] });
        return;
      }

      setAuthState({ status: 'authenticated', profile, productRole: access.productRole });
    };

    loadProfile().catch(() => {
      if (cancelled) return;
      setAuthState({
        status: 'error',
        message: 'No se pudo verificar el perfil. Revisa tu conexión e inténtalo nuevamente.',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [attempt, bootstrapComplete, sessionError, sessionReady, sessionUserId, tenantState]);

  const signIn = async (email: string, password: string) => {
    setAuthState({ status: 'signed-out', error: null, submitting: true });
    try {
      await authRepository.signIn(email, password);
    } catch (error) {
      setAuthState({
        status: 'signed-out',
        error: error instanceof Error ? error.message : 'No se pudo iniciar sesión.',
        submitting: false,
      });
    }
  };

  const signOut = async () => {
    try {
      await authRepository.signOut();
    } catch {
      setAuthState({ status: 'error', message: 'No se pudo cerrar la sesión. Recarga la aplicación.' });
    }
  };

  const retryProfile = () => {
    setAuthState({ status: 'loading' });
    setAttempt((currentAttempt) => currentAttempt + 1);
  };

  return (
    <AuthContext.Provider value={{ state: authState, signIn, signOut, retryProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
