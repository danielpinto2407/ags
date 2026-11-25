import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { invitationRepository, type InvitationDeliveryStatus } from '@/data/invitationRepository';
import ModalShell from '@/components/ModalShell';
import AppButton from '@/components/AppButton';
import AppInput from '@/components/AppInput';

interface InviteMemberModalProps {
  onClose: () => void;
}

export default function InviteMemberModal({ onClose }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<InvitationDeliveryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await invitationRepository.invitePersonalizedMember(email);
      setDeliveryStatus(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo enviar la invitación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      title="Invitar alumna"
      subtitle="Entrenamiento personalizado"
      onClose={onClose}
      size="md"
    >
        {deliveryStatus ? (
          <div className="space-y-4" role="status">
            <div className="flex gap-3 rounded-xl border border-emerald-900/70 bg-emerald-950/30 p-4">
              <Check className="mt-0.5 shrink-0 text-emerald-400" size={18} />
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  {deliveryStatus === 'sent' ? 'Invitación enviada' : 'Invitación reenviada'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Enviamos el acceso a <span className="text-zinc-200">{email.trim()}</span>. La alumna podrá entrar a la aplicación desde el enlace.
                </p>
              </div>
            </div>
            <button
              className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white hover:bg-brand-action-hover"
              onClick={onClose}
              type="button"
            >
              Listo
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300" htmlFor="invite-email">
                Correo electrónico
              </label>
              <AppInput
                autoComplete="email"
                autoFocus
                className="px-3.5 py-3"
                id="invite-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="persona@correo.com"
                required
                type="email"
                value={email}
              />
            </div>

            {error && <p className="text-sm text-rose-400" role="alert">{error}</p>}

            <div className="flex gap-3 pt-1">
              <AppButton variant="secondary" className="flex-1" disabled={isSubmitting} onClick={onClose} type="button">
                Cancelar
              </AppButton>
              <AppButton variant="primary" className="flex-1" disabled={isSubmitting || !email.trim()} type="submit">
                {isSubmitting ? 'Enviando…' : 'Enviar invitación'}
              </AppButton>
            </div>
          </form>
        )}
    </ModalShell>
  );
}