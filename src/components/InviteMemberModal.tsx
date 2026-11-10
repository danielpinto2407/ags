import { useState, type FormEvent } from 'react';
import { Check, MailPlus, X } from 'lucide-react';
import { invitationRepository, type InvitationDeliveryStatus } from '@/data/invitationRepository';

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in sm:items-center sm:px-5">
      <section
        aria-labelledby="invite-member-title"
        aria-modal="true"
        className="w-full max-w-md rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl animate-slide-up sm:rounded-2xl"
        role="dialog"
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-950 text-brand-400">
              <MailPlus size={19} />
            </span>
            <div>
              <h2 id="invite-member-title" className="font-display text-lg font-bold text-white">Invitar alumna</h2>
              <p className="text-xs text-zinc-500">Entrenamiento personalizado</p>
            </div>
          </div>
          <button
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>

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
              className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-500"
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
              <input
                autoComplete="email"
                autoFocus
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-brand-500"
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
              <button
                className="flex-1 rounded-xl border border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-900"
                disabled={isSubmitting}
                onClick={onClose}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-500 disabled:cursor-wait disabled:opacity-60"
                disabled={isSubmitting || !email.trim()}
                type="submit"
              >
                <MailPlus size={16} />
                {isSubmitting ? 'Enviando…' : 'Enviar invitación'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}