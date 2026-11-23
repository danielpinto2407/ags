import { Check, X } from 'lucide-react';
import ModalShell from '@/components/ModalShell';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <ModalShell
      title={title}
      subtitle={message}
      closeLabel={cancelLabel}
      onClose={() => { if (!busy) onClose(); }}
      size="sm"
    >
      <div className="flex justify-end gap-2">
        <button
          className="min-h-10 rounded-xl px-3 text-xs font-semibold"
          disabled={busy}
          onClick={onClose}
          style={{ color: 'var(--tenant-text, #FAFAFA)' }}
          type="button"
        >
          <X className="mr-1 inline" size={14} />{cancelLabel}
        </button>
        <button
          className="min-h-10 rounded-xl px-3 text-xs font-semibold disabled:opacity-50"
          disabled={busy}
          onClick={() => void onConfirm()}
          style={danger
            ? { backgroundColor: 'var(--tenant-secondary, #52525B)', color: 'var(--tenant-on-primary, #FAFAFA)' }
            : { backgroundColor: 'var(--tenant-primary, #71717A)', color: 'var(--tenant-on-primary, #FAFAFA)' }}
          type="button"
        >
          <Check className="mr-1 inline" size={14} />{busy ? 'Guardando…' : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}
