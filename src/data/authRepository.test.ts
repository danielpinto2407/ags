import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMethods = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@/data/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabaseClient: { auth: authMethods },
}));

import { authRepository } from '@/data/authRepository';

describe('password recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMethods.resetPasswordForEmail.mockResolvedValue({ error: null });
    authMethods.updateUser.mockResolvedValue({ error: null });
    vi.stubGlobal('window', { location: { origin: 'https://ags.example.test' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the current app origin and a fixed callback path for recovery links', async () => {
    await authRepository.requestPasswordRecovery('member@example.test');

    expect(authMethods.resetPasswordForEmail).toHaveBeenCalledWith('member@example.test', {
      redirectTo: 'https://ags.example.test/?password_recovery=1',
    });
  });

  it('returns a generic request error without exposing account lookup details', async () => {
    authMethods.resetPasswordForEmail.mockResolvedValue({ error: new Error('User not found') });

    await expect(authRepository.requestPasswordRecovery('member@example.test'))
      .rejects.toThrow('No se pudo procesar la solicitud. Inténtalo más tarde.');
  });

  it('updates the password through the current recovery session', async () => {
    await authRepository.updatePassword('a-secure-new-password');

    expect(authMethods.updateUser).toHaveBeenCalledWith({ password: 'a-secure-new-password' });
  });

  it('does not expose raw password update errors', async () => {
    authMethods.updateUser.mockResolvedValue({ error: new Error('recovery session expired') });

    await expect(authRepository.updatePassword('a-secure-new-password'))
      .rejects.toThrow('No se pudo actualizar la contraseña. Solicita un enlace nuevo.');
  });
});
