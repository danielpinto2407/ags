import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import AppButton from '@/components/AppButton';
import FeedbackMessage from '@/components/FeedbackMessage';
import ModalShell from '@/components/ModalShell';
import { profileRepository } from '@/data/profileRepository';

type Contact = Awaited<ReturnType<typeof profileRepository.getOwnCoachWhatsappContact>>;

export default function StudentWhatsappContact({ training }: { training: boolean }) {
  const [contact, setContact] = useState<Contact>(null);
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    profileRepository.getOwnCoachWhatsappContact()
      .then((result) => { if (!cancelled) setContact(result); })
      .catch(() => { if (!cancelled) { setContact(null); setLoadError(true); } });
    return () => { cancelled = true; };
  }, [retry]);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => trigger?.focus();
  }, [open]);

  if (!contact && !loadError) return null;

  const avatarUrl = profileRepository.getPublicMediaUrl(contact?.avatarPath ?? null);
  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        aria-label="Contactar a mi coach por WhatsApp"
        className="fixed right-5 z-40 flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold shadow-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        style={{ bottom: training ? 'calc(1rem + env(safe-area-inset-bottom))' : 'calc(6rem + env(safe-area-inset-bottom))', backgroundColor: '#25D366', borderColor: '#128C4A', color: '#102d1b', outlineColor: 'var(--tenant-primary)' }}
        type="button"
      >
        <MessageCircle aria-hidden="true" size={19} /> WhatsApp
      </button>
      {open && (
        <ModalShell contentRef={dialogRef} darkBackdrop onClose={() => setOpen(false)} onKeyDown={handleDialogKeyDown} size="sm" title="Contactar a tu coach">
          {avatarUrl && !imageFailed && (
            <div className="mx-auto mb-4 h-48 max-w-48 overflow-hidden motion-safe:animate-fade-in">
              <img alt="" className="h-full w-full object-contain object-top" onError={() => setImageFailed(true)} src={avatarUrl} />
            </div>
          )}
          {loadError && <FeedbackMessage kind="error" message="No se pudo cargar el contacto de tu coach." />}
          {contact && <p className="text-sm" style={{ color: 'var(--tenant-text)' }}>¿Deseas comunicarte con {contact.coachName} por WhatsApp?</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AppButton onClick={() => setOpen(false)} type="button" variant="secondary">Cancelar</AppButton>
            {loadError && <AppButton onClick={() => { setOpen(false); setRetry((current) => current + 1); }} type="button">Reintentar</AppButton>}
            {contact && (
              <a className="app-button app-button-primary flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold" href={`https://wa.me/${contact.number}`} rel="noopener noreferrer" target="_blank">
                <MessageCircle aria-hidden="true" size={16} /> Abrir WhatsApp
              </a>
            )}
          </div>
        </ModalShell>
      )}
    </>
  );
}