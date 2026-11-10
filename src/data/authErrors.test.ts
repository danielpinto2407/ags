import { describe, expect, it } from 'vitest';
import { toSignInErrorMessage } from '@/data/authErrors';

describe('sign-in error messages', () => {
  it('uses the same generic message for invalid credentials', () => {
    expect(toSignInErrorMessage(400, 'invalid_credentials')).toBe('Correo electrónico o contraseña incorrectos.');
    expect(toSignInErrorMessage(401, undefined)).toBe('Correo electrónico o contraseña incorrectos.');
  });

  it('does not expose raw backend errors for unrelated failures', () => {
    expect(toSignInErrorMessage(500, 'unexpected_failure')).toBe('No se pudo iniciar sesión. Inténtalo nuevamente.');
  });
});
