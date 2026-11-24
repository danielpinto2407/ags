import type { SelectHTMLAttributes } from 'react';

interface AppSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export default function AppSelect({ invalid = false, className = '', children, ...props }: AppSelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={`w-full min-h-11 rounded-xl border px-3 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${invalid ? '' : ''} ${className}`}
      style={{
        backgroundColor: 'var(--tenant-surface, #FFF9F6)',
        borderColor: invalid ? 'var(--tenant-secondary, #963D5B)' : 'var(--tenant-border, #E5D8D2)',
        color: 'var(--tenant-text, #2B2528)',
        colorScheme: 'light',
      }}
      {...props}
    >
      {children}
    </select>
  );
}
