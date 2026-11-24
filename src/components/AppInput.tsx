import type { InputHTMLAttributes } from 'react';

interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export default function AppInput({ invalid = false, className = '', ...props }: AppInputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${invalid ? '' : ''} ${className}`}
      style={{
        backgroundColor: 'var(--tenant-surface, #FFF9F6)',
        borderColor: invalid ? 'var(--tenant-secondary, #963D5B)' : 'var(--tenant-border, #E5D8D2)',
        color: 'var(--tenant-text, #2B2528)',
        colorScheme: 'light',
      }}
      {...props}
    />
  );
}
