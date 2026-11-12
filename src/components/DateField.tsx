import { useRef } from 'react';
import { CalendarDays } from 'lucide-react';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
}

export default function DateField({ value, onChange, ariaLabel, disabled = false }: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <span className="relative mt-1.5 block">
      <input
        aria-label={ariaLabel}
        className="tenant-date-field min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 pr-11 text-sm text-zinc-200 focus:border-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        ref={inputRef}
        style={{ colorScheme: 'light', accentColor: 'var(--tenant-primary)' }}
        type="date"
        value={value}
      />
      <button
        aria-label={`Abrir ${ariaLabel.toLocaleLowerCase()}`}
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-brand-500 transition-colors hover:bg-brand-950/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => {
          const input = inputRef.current;
          if (!input) return;
          if (typeof input.showPicker === 'function') input.showPicker();
          else {
            input.focus();
            input.click();
          }
        }}
        type="button"
      >
        <CalendarDays aria-hidden="true" size={16} />
      </button>
    </span>
  );
}