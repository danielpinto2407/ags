const INVALID_CREDENTIALS_MESSAGE = 'Correo electrónico o contraseña incorrectos.';
const SIGN_IN_ERROR_MESSAGE = 'No se pudo iniciar sesión. Inténtalo nuevamente.';

export function toSignInErrorMessage(status: number | undefined, code: string | undefined): string {
  if (status === 400 || status === 401 || code === 'invalid_credentials') {
    return INVALID_CREDENTIALS_MESSAGE;
  }
  return SIGN_IN_ERROR_MESSAGE;
}
