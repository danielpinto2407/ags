import { createContext, useContext } from 'react';
import type { Profile, ProductRole } from '@/domain/profile';

export type AuthState =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'signed-out'; error: string | null; submitting: boolean }
  | { status: 'profile-loading' }
  | { status: 'authenticated'; profile: Profile; productRole: ProductRole | null }
  | { status: 'blocked'; message: string }
  | { status: 'error'; message: string };

export interface AuthContextValue {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  retryProfile: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
