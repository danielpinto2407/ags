import type { TextareaHTMLAttributes } from 'react';

interface AppTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export default function AppTextarea({ invalid = false, className = '', ...props }: AppTextareaProps) {
  return (
    <textarea
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
