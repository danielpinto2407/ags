import { ArrowRight, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import PasswordField from '@/components/PasswordField';
import { invitationRepository } from '@/data/invitationRepository';
import AppInput from '@/components/AppInput';

interface InvitationAcceptanceScreenProps {
  invitationId: string;
  gymName: string;
  onAccepted: () => void;
  acceptanceKind?: 'personalized_member' | 'coach_admin';
}

export default function InvitationAcceptanceScreen({
  invitationId,
  gymName,
  onAccepted,
  acceptanceKind = 'personalized_member',
}: InvitationAcceptanceScreenProps) {
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (acceptanceKind === 'coach_admin' && !/^[1-9][0-9]{7,14}$/.test(whatsappNumber.trim())) {
      setError('Ingresa tu número de WhatsApp con el código del país, sin espacios ni símbolos.');
      return;
    }
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
      if (acceptanceKind === 'coach_admin') {
        await invitationRepository.acceptCoachInvitation(invitationId, fullName, password, whatsappNumber.trim());
      } else {
        await invitationRepository.acceptPersonalizedInvitation(invitationId, fullName, password);
      }
      const url = new URL(window.location.href);
      url.searchParams.delete('invitation_id');
      url.searchParams.delete('invitation_role');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      onAccepted();
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : 'No se pudo activar tu acceso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="tenant-app flex min-h-screen w-full items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-950 text-brand-400">
          <UserRound size={22} />
        </div>
        <p className="mb-1 text-xs font-semibold uppercase text-brand-400">{acceptanceKind === 'coach_admin' ? 'Invitación al equipo de coaching' : 'Invitación al gimnasio'}</p>
        <h1 className="font-display text-2xl font-bold text-white">Completa tu acceso</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Estás a un paso de entrar a <span className="text-zinc-200">{gymName}</span>. Confirma tu nombre completo y crea tu contraseña para activar tu cuenta.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-300" htmlFor="invite-full-name">
              Nombre completo
            </label>
            <AppInput
              autoComplete="name"
              autoFocus
              className="px-3.5 py-3"
              id="invite-full-name"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Tu nombre"
              required
              value={fullName}
            />
          </div>

          {acceptanceKind === 'coach_admin' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300" htmlFor="invite-whatsapp">WhatsApp</label>
              <AppInput autoComplete="tel" id="invite-whatsapp" inputMode="numeric" maxLength={15} onChange={(event) => setWhatsappNumber(event.target.value)} placeholder="573001234567" required type="tel" value={whatsappNumber} />
              <p className="mt-1 text-xs text-zinc-400">Incluye el código del país, sin + ni espacios.</p>
            </div>
          )}

          <PasswordField
            autoComplete="new-password"
            id="invite-password"
            label="Crea tu contraseña"
            minLength={10}
            onChange={setPassword}
            value={password}
          />

          <div>
            <PasswordField
              autoComplete="new-password"
              describedBy={passwordConfirmation && password !== passwordConfirmation ? 'invite-password-mismatch' : undefined}
              id="invite-password-confirmation"
              invalid={Boolean(passwordConfirmation && password !== passwordConfirmation)}
              label="Confirma tu contraseña"
              minLength={10}
              onChange={setPasswordConfirmation}
              value={passwordConfirmation}
            />
            {passwordConfirmation && password !== passwordConfirmation && (
              <p className="mt-1.5 text-xs text-rose-400" id="invite-password-mismatch" role="status">
                Las contraseñas no coinciden todavía.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-rose-400" role="alert">{error}</p>}

          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white hover:bg-brand-action-hover disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting || fullName.trim().length < 2 || password.length < 10 || password !== passwordConfirmation || (acceptanceKind === 'coach_admin' && !/^[1-9][0-9]{7,14}$/.test(whatsappNumber.trim()))}
            type="submit"
          >
            {isSubmitting ? 'Activando acceso…' : acceptanceKind === 'coach_admin' ? 'Entrar a mi equipo' : 'Entrar a mi gimnasio'}
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>
      </section>
    </main>
  );
}