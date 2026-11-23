import { useState, type FormEvent } from 'react';
import AppButton from '@/components/AppButton';
import FeedbackMessage from '@/components/FeedbackMessage';
import AppInput from '@/components/AppInput';
import { ArrowLeft, ArrowRight, KeyRound, MailCheck } from 'lucide-react';
import PasswordField from '@/components/PasswordField';

type PasswordRecoveryMode = 'request' | 'update' | 'complete' | 'invalid';

interface PasswordRecoveryScreenProps {
  gymName: string;
  mode: PasswordRecoveryMode;
  onRequest?: (email: string) => Promise<void>;
  onUpdate?: (password: string) => Promise<void>;
  onReturnToSignIn: () => Promise<void>;
}

export default function PasswordRecoveryScreen({
  gymName,
  mode,
  onRequest,
  onUpdate,
  onReturnToSignIn,
}: PasswordRecoveryScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onRequest) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onRequest(email.trim());
      setRequestSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo procesar la solicitud. Inténtalo más tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onUpdate) return;
    setError(null);
    if (password.length < 10) {
      setError('La contraseña debe tener al menos 10 caracteres.');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onUpdate(password);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la contraseña. Solicita un enlace nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onReturnToSignIn();
    } catch (returnError) {
      setError(returnError instanceof Error ? returnError.message : 'No se pudo volver al inicio de sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = mode === 'request'
    ? 'Recupera tu contraseña'
    : mode === 'update'
      ? 'Elige una nueva contraseña'
      : mode === 'complete'
        ? 'Contraseña actualizada'
        : 'El enlace ya no es válido';

  return (
    <section aria-labelledby="password-recovery-title" className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl sm:p-8">
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-brand-950 text-brand-400">
          {mode === 'request' ? <MailCheck aria-hidden="true" size={22} /> : <KeyRound aria-hidden="true" size={22} />}
        </div>
        <p className="mb-1 text-xs font-semibold uppercase text-brand-400">{gymName}</p>
        <h1 className="font-display text-2xl font-bold text-white" id="password-recovery-title">{title}</h1>

        {mode === 'request' && (
          requestSent ? (
            <div className="mt-3 space-y-5">
              <p className="text-sm leading-relaxed text-zinc-400">
                Si el correo está asociado a una cuenta, recibirás un enlace para continuar. Revisa también la carpeta de correo no deseado.
              </p>
              <AppButton
                variant="secondary"
                className="w-full"
                onClick={handleReturn}
                type="button"
              >
                <ArrowLeft aria-hidden="true" size={16} /> Volver al inicio de sesión
              </AppButton>
            </div>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={handleRequest}>
              <p className="text-sm leading-relaxed text-zinc-400">
                Escribe el correo de tu cuenta y te enviaremos instrucciones para cambiar la contraseña.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-300" htmlFor="recovery-email">
                  Correo electrónico
                </label>
                <AppInput
                  autoComplete="email"
                  autoFocus
                  className="px-3.5 py-3"
                  disabled={isSubmitting}
                  id="recovery-email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </div>
              {error && <FeedbackMessage kind="error" message={error} />}
              <AppButton
                variant="primary"
                className="w-full"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Enviando…' : 'Enviar instrucciones'}
                {!isSubmitting && <ArrowRight aria-hidden="true" size={16} />}
              </AppButton>
              <AppButton
                variant="ghost"
                className="w-full"
                disabled={isSubmitting}
                onClick={handleReturn}
                type="button"
              >
                Volver al inicio de sesión
              </AppButton>
            </form>
          )
        )}

        {mode === 'update' && (
          <form className="mt-5 space-y-4" onSubmit={handleUpdate}>
            <p className="text-sm leading-relaxed text-zinc-400">
              Crea una contraseña de al menos 10 caracteres para tu cuenta de {gymName}.
            </p>
            <PasswordField
              autoComplete="new-password"
              disabled={isSubmitting}
              id="recovery-new-password"
              label="Nueva contraseña"
              minLength={10}
              onChange={setPassword}
              value={password}
            />
            <PasswordField
              autoComplete="new-password"
              describedBy={passwordConfirmation && password !== passwordConfirmation ? 'recovery-password-mismatch' : undefined}
              disabled={isSubmitting}
              id="recovery-password-confirmation"
              invalid={Boolean(passwordConfirmation && password !== passwordConfirmation)}
              label="Confirma la nueva contraseña"
              minLength={10}
              onChange={setPasswordConfirmation}
              value={passwordConfirmation}
            />
            {passwordConfirmation && password !== passwordConfirmation && (
              <p className="text-xs text-rose-400" id="recovery-password-mismatch" role="status">
                Las contraseñas no coinciden todavía.
              </p>
            )}
            {error && <FeedbackMessage kind="error" message={error} />}
            <AppButton
              variant="primary"
              className="w-full"
              disabled={isSubmitting || password.length < 10 || password !== passwordConfirmation}
              type="submit"
            >
              {isSubmitting ? 'Actualizando…' : 'Guardar nueva contraseña'}
            </AppButton>
          </form>
        )}

        {(mode === 'complete' || mode === 'invalid') && (
          <div className="mt-3 space-y-5">
            <p className="text-sm leading-relaxed text-zinc-400">
              {mode === 'complete'
                ? 'Tu contraseña se actualizó. Ya puedes iniciar sesión con la nueva contraseña.'
                : 'El enlace puede haber caducado o ya se utilizó. Solicita uno nuevo para continuar.'}
            </p>
            {error && <FeedbackMessage kind="error" message={error} />}
            <AppButton
              variant="secondary"
              className="w-full"
              disabled={isSubmitting}
              onClick={handleReturn}
              type="button"
            >
              {isSubmitting ? 'Volviendo…' : 'Ir al inicio de sesión'}
              {!isSubmitting && <ArrowRight aria-hidden="true" size={16} />}
            </AppButton>
          </div>
        )}
    </section>
  );
}
