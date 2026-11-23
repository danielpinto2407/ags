import { useEffect, useId, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';

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
  const titleId = useId();
  const portalTheme = (() => {
    const root = document.querySelector<HTMLElement>('main.platform-admin, .tenant-app');
    if (!root) return {} as CSSProperties;
    const styles = getComputedStyle(root);
    const variables = [
      '--tenant-primary', '--tenant-on-primary', '--tenant-secondary', '--tenant-background', '--tenant-accent',
      '--tenant-surface', '--tenant-text', '--tenant-muted', '--tenant-border',
      '--tenant-warm-accent', '--tenant-soft-accent', '--tenant-body-font', '--tenant-display-font',
    ];
    return Object.fromEntries(variables.map((name) => [name, styles.getPropertyValue(name).trim()])) as CSSProperties;
  })();

  useEffect(() => {
    if (!confirming) return;
    const scrollContainer = document.querySelector<HTMLElement>('[data-app-scroll-container], main.platform-admin');
    const previousOverflow = scrollContainer?.style.overflowY;
    if (scrollContainer) scrollContainer.style.overflowY = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !updating) setConfirming(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      if (scrollContainer) scrollContainer.style.overflowY = previousOverflow ?? '';
    };
  }, [confirming, updating]);

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
      {confirming && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--tenant-background, #09090B) 72%, transparent)' }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget && !updating) setConfirming(false);
          }}
          role="presentation"
        >
          <section
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
            style={{
              ...portalTheme,
              backgroundColor: 'var(--tenant-surface, #18181B)',
              border: '1px solid var(--tenant-border, #27272A)',
              color: 'var(--tenant-text, #FAFAFA)',
            }}
            onPointerDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <h2 id={titleId} className="text-sm font-bold" style={{ color: 'var(--tenant-text, #FAFAFA)' }}>
              {active ? `${confirmActiveTitle}?` : `${confirmInactiveTitle}?`}
            </h2>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--tenant-muted, #A1A1AA)' }}>{itemName}</p>
            {error && <p className="mt-3 text-xs text-rose-300" role="alert">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                aria-label="Cancelar cambio"
                className="min-h-10 rounded-xl px-3 text-xs font-semibold"
                style={{ color: 'var(--tenant-text, #FAFAFA)' }}
                disabled={updating}
                onClick={() => setConfirming(false)}
                type="button"
              ><X className="mr-1 inline" size={14} />Cancelar</button>
              <button
                aria-label="Confirmar cambio"
                className="min-h-10 rounded-xl px-3 text-xs font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--tenant-primary, #71717A)', color: 'var(--tenant-on-primary, #FAFAFA)' }}
                disabled={updating}
                onClick={() => void confirmChange()}
                type="button"
              ><Check className="mr-1 inline" size={14} />{updating ? 'Guardando…' : 'Confirmar'}</button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}
