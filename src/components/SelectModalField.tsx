import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

export interface SelectModalOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SelectModalFieldProps {
  value: string;
  options: SelectModalOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  modalTitle: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function SelectModalField({
  value,
  options,
  onChange,
  ariaLabel,
  modalTitle,
  placeholder = 'Seleccionar',
  disabled = false,
  className = '',
}: SelectModalFieldProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const optionsRef = useRef(options);
  const typeaheadRef = useRef('');
  const selectedOption = options.find((option) => option.value === value);
  optionsRef.current = options;

  useEffect(() => {
    if (!open) return undefined;
    const triggerElement = triggerRef.current;
    const scrollContainer = document.querySelector<HTMLElement>('[data-app-scroll-container]');
    const previousOverflowY = scrollContainer?.style.overflowY;
    const previousOverscrollBehavior = scrollContainer?.style.overscrollBehavior;

    if (scrollContainer) {
      scrollContainer.style.overflowY = 'hidden';
      scrollContainer.style.overscrollBehavior = 'none';
    }

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      triggerElement?.focus();
      if (scrollContainer) {
        scrollContainer.style.overflowY = previousOverflowY ?? '';
        scrollContainer.style.overscrollBehavior = previousOverscrollBehavior ?? '';
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const enabledOptions = optionsRef.current.map((option, index) => (!option.disabled ? index : -1)).filter((index) => index >= 0);
    const nextIndex = enabledOptions.includes(focusedIndex) ? focusedIndex : enabledOptions[0];
    if (nextIndex !== undefined) optionRefs.current[nextIndex]?.focus();
    else dialogRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
  }, [focusedIndex, open]);

  const selectOption = (option: SelectModalOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabledOptions = options.map((option, index) => (!option.disabled ? index : -1)).filter((index) => index >= 0);
    if (enabledOptions.length === 0) return;
    const currentPosition = Math.max(0, enabledOptions.indexOf(focusedIndex));
    let nextIndex: number | undefined;

    if (event.key === 'ArrowDown') nextIndex = enabledOptions[(currentPosition + 1) % enabledOptions.length];
    else if (event.key === 'ArrowUp') nextIndex = enabledOptions[(currentPosition - 1 + enabledOptions.length) % enabledOptions.length];
    else if (event.key === 'Home') nextIndex = enabledOptions[0];
    else if (event.key === 'End') nextIndex = enabledOptions[enabledOptions.length - 1];
    else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      typeaheadRef.current += event.key.toLocaleLowerCase();
      const start = currentPosition + 1;
      const orderedOptions = [...enabledOptions.slice(start), ...enabledOptions.slice(0, start)];
      nextIndex = orderedOptions.find((index) => options[index].label.toLocaleLowerCase().startsWith(typeaheadRef.current));
      window.setTimeout(() => { typeaheadRef.current = ''; }, 500);
    } else return;

    event.preventDefault();
    if (nextIndex !== undefined) setFocusedIndex(nextIndex);
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'))
      .filter((element) => element.tabIndex >= 0);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
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
        aria-haspopup="dialog"
        aria-label={`${ariaLabel}: ${selectedOption?.label ?? placeholder}`}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-left text-sm text-zinc-200 shadow-sm transition-colors hover:border-brand-700 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        disabled={disabled}
        onClick={() => {
          const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
          const firstEnabledIndex = options.findIndex((option) => !option.disabled);
          setFocusedIndex(selectedIndex >= 0 ? selectedIndex : Math.max(0, firstEnabledIndex));
          setOpen(true);
        }}
        ref={triggerRef}
        type="button"
      >
        <span className={`min-w-0 flex-1 truncate ${selectedOption ? 'text-zinc-100' : 'text-zinc-500'}`}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown aria-hidden="true" className="shrink-0 text-brand-400" size={16} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center overscroll-none bg-black/75 px-3 pb-3 backdrop-blur-sm sm:items-center sm:px-5"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="max-h-[min(78vh,620px)] w-full max-w-lg overscroll-none overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/60 animate-slide-up sm:animate-scale-in"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleDialogKeyDown}
            ref={dialogRef}
            role="dialog"
          >
            <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-sm font-bold text-white" id={titleId}>{modalTitle}</h2>
                <p className="mt-0.5 text-[10px] text-zinc-500">{options.length} opciones</p>
              </div>
              <button
                aria-label="Cerrar selector"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[calc(min(78vh,620px)-68px)] overscroll-contain overflow-y-auto p-2" onKeyDown={handleListboxKeyDown} role="listbox" aria-label={ariaLabel}>
              {options.map((option, index) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    aria-disabled={option.disabled || undefined}
                    aria-selected={selected}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brand-400 ${
                      selected
                        ? 'font-semibold'
                        : 'text-zinc-300 hover:bg-zinc-900'
                    } ${option.disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                    disabled={option.disabled}
                    onClick={() => selectOption(option)}
                    role="option"
                    ref={(element) => { optionRefs.current[index] = element; }}
                    style={selected ? { backgroundColor: 'var(--tenant-primary)', color: 'var(--tenant-background)' } : undefined}
                    tabIndex={focusedIndex === index ? 0 : -1}
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{option.label}</span>
                      {option.description && <span className={`mt-0.5 block truncate text-[10px] ${selected ? 'text-white/80' : 'text-zinc-500'}`}>{option.description}</span>}
                    </span>
                    {selected && <Check aria-hidden="true" className="shrink-0" size={16} style={{ color: 'var(--tenant-background)' }} />}
                  </button>
                );
              })}
              {options.length === 0 && <p className="px-3 py-8 text-center text-xs text-zinc-500">No hay opciones disponibles.</p>}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
