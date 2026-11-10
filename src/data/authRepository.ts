import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabaseClient } from '@/data/supabase/client';
import { toSignInErrorMessage } from '@/data/authErrors';
import { isProfile, type Profile } from '@/domain/profile';

export interface AuthSnapshot {
  session: Session | null;
  user: User | null;
}

function requireSupabaseClient() {
  if (!supabaseClient) throw new Error('Supabase no está configurado para esta aplicación.');
  return supabaseClient;
}

export const authRepository = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  async getSession(): Promise<AuthSnapshot> {
    const client = requireSupabaseClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error('No se pudo recuperar la sesión.');
    return { session: data.session, user: data.session?.user ?? null };
  },

  subscribeToAuthChanges(
    listener: (event: AuthChangeEvent, session: Session | null) => void
  ): () => void {
    const client = requireSupabaseClient();
    const { data } = client.auth.onAuthStateChange(listener);
    return () => data.subscription.unsubscribe();
  },

  async signIn(email: string, password: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(toSignInErrorMessage(error.status, error.code));
  },

  async signOut(): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) throw new Error('No se pudo cerrar la sesión. Inténtalo nuevamente.');
  },

  async getVerifiedUser(expectedUserId: string): Promise<User> {
    const client = requireSupabaseClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user || data.user.id !== expectedUserId) {
      throw new Error('No se pudo verificar la sesión. Inicia sesión nuevamente.');
    }
    return data.user;
  },

  async getOwnProfile(userId: string): Promise<Profile | null> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('profiles')
      .select('id, tenant_id, role, status, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new Error('No se pudo cargar el perfil de la cuenta.');
    if (data === null) return null;
    if (!isProfile(data)) throw new Error('El perfil recibido no tiene un formato válido.');
    return data;
  },
};
