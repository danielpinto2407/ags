import { useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

interface StatusToggleProps {
  itemName: string;
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  confirmActiveTitle: string;
  confirmInactiveTitle: string;
  onChange: (active: boolean) => Promise<void>;
}

export default function StatusToggle({
  itemName,
  active,
  activeLabel,
  inactiveLabel,
  confirmActiveTitle,
  confirmInactiveTitle,
  onChange,
}: StatusToggleProps) {
  const [confirming, setConfirming] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmChange = async () => {
    setUpdating(true);
    setError(null);
    try {
      await onChange(!active);
      setConfirming(false);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'No se pudo actualizar el estado.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="relative flex shrink-0 flex-col items-end">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-semibold ${active ? 'text-emerald-300' : 'text-zinc-500'}`}>
          {active ? activeLabel : inactiveLabel}
        </span>
        <button
          aria-checked={active}
          aria-label={`${active ? confirmActiveTitle : confirmInactiveTitle}: ${itemName}`}
          className={`relative h-5 w-9 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:cursor-wait disabled:opacity-50 ${active ? 'bg-brand-500' : 'bg-zinc-700'}`}
          disabled={updating}
          onClick={() => {
            setError(null);
            setConfirming((value) => !value);
          }}
          role="switch"
          title={active ? confirmActiveTitle : confirmInactiveTitle}
          type="button"
        >
          <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>
      {confirming && (
        <ConfirmModal
          title={active ? confirmActiveTitle : confirmInactiveTitle}
          message={error ?? itemName}
          confirmLabel={active ? 'Desactivar' : 'Activar'}
          busy={updating}
          onClose={() => setConfirming(false)}
          onConfirm={confirmChange}
        />
      )}
    </div>
  );
}
