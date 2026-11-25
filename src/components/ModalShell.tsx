import { useEffect, useId, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  contentRef?: RefObject<HTMLElement | null>;
  form?: boolean;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
  darkBackdrop?: boolean;
}


export default function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  closeLabel = 'Cerrar',
  size = 'md',
  contentRef,
  form = false,
  onSubmit,
  onKeyDown,
  darkBackdrop = false,
}: ModalShellProps) {
  const titleId = useId();
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const maxWidth = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-[520px]' : 'max-w-lg';
  const themeRoot = document.querySelector<HTMLElement>('.tenant-app, main.platform-admin');
  const themeStyles = getComputedStyle(themeRoot ?? document.documentElement);
  const themeVariableNames = [
    '--tenant-primary', '--tenant-on-primary', '--tenant-secondary', '--tenant-background',
    '--tenant-accent', '--tenant-surface', '--tenant-text', '--tenant-muted', '--tenant-border',
    '--tenant-warm-accent', '--tenant-soft-accent', '--tenant-body-font', '--tenant-display-font',
  ] as const;
  const portalTheme = Object.fromEntries(
    themeVariableNames.map((name) => [name, themeStyles.getPropertyValue(name).trim()])
  ) as CSSProperties;
  const panelStyle: CSSProperties = {
    ...portalTheme,
    backgroundColor: 'var(--tenant-surface, #FFF9F6)',
    borderColor: 'var(--tenant-border, #E5D8D2)',
    color: 'var(--tenant-text, #2B2528)',
    fontFamily: 'var(--tenant-body-font, "DM Sans")',
  };

  const panel = form ? (
    <form
      aria-labelledby={titleId}
      aria-modal="true"
      className={`modal-shell max-h-[92vh] w-full ${maxWidth} overscroll-none overflow-y-auto rounded-t-2xl border p-5 shadow-2xl sm:mb-0 sm:rounded-2xl`}
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      ref={contentRef as RefObject<HTMLFormElement>}
      role="dialog"
      style={panelStyle}
    >
      <div className="flex items-center gap-3 border-b pb-3.5" style={{ borderColor: 'var(--tenant-border, #27272A)' }}>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-sm font-bold" id={titleId} style={{ color: 'var(--tenant-secondary, var(--tenant-text, #FAFAFA))' }}>{title}</h2>
          {subtitle && <p className="mt-0.5 text-[10px]" style={{ color: 'var(--tenant-muted, #A1A1AA)' }}>{subtitle}</p>}
        </div>
        <button aria-label={closeLabel} className="modal-close-button flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors" onClick={onClose} type="button"><X size={16} /></button>
      </div>
      <div className="pt-4" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>{children}</div>
    </form>
  ) : (
    <section
      aria-labelledby={titleId}
      aria-modal="true"
      className={`modal-shell max-h-[92vh] w-full ${maxWidth} overscroll-none overflow-y-auto rounded-t-2xl border p-5 shadow-2xl sm:mb-0 sm:rounded-2xl`}
      onKeyDown={onKeyDown}
      ref={contentRef as RefObject<HTMLElement>}
      role="dialog"
      style={panelStyle}
    >
      <div className="flex items-center gap-3 border-b pb-3.5" style={{ borderColor: 'var(--tenant-border, #27272A)' }}>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-sm font-bold" id={titleId} style={{ color: 'var(--tenant-secondary, var(--tenant-text, #FAFAFA))' }}>{title}</h2>
          {subtitle && <p className="mt-0.5 text-[10px]" style={{ color: 'var(--tenant-muted, #A1A1AA)' }}>{subtitle}</p>}
        </div>
        <button aria-label={closeLabel} className="modal-close-button flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors" onClick={onClose} type="button"><X size={16} /></button>
      </div>
      <div className="pt-4" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>{children}</div>
    </section>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex touch-none items-end justify-center px-3 pb-3 backdrop-blur-sm sm:items-center sm:px-5 sm:pb-0"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      role="presentation"
      style={{
        ...portalTheme,
        backgroundColor: darkBackdrop ? 'rgba(0, 0, 0, 0.8)' : 'color-mix(in srgb, var(--tenant-primary, #71717A) 18%, transparent)',
      }}
    >
      {panel}
    </div>,
    document.body
  );
}
