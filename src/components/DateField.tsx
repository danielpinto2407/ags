import { CalendarDays } from 'lucide-react';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
}

export default function DateField({ value, onChange, ariaLabel, disabled = false }: DateFieldProps) {
  return (
    <span className="relative mt-1.5 block">
      <input
        aria-label={ariaLabel}
        className="tenant-date-field min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 pr-11 text-sm text-zinc-200 focus:border-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        style={{ colorScheme: 'light', accentColor: 'var(--tenant-primary)' }}
        type="date"
        value={value}
      />
      <CalendarDays aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brand-500" size={16} />
    </span>
  );
}