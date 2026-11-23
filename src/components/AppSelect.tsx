import type { SelectHTMLAttributes } from 'react';

interface AppSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export default function AppSelect({ invalid = false, className = '', children, ...props }: AppSelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={`w-full min-h-11 rounded-xl border px-3 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${invalid ? 'border-rose-500' : 'border-zinc-800 focus:border-brand-500'} ${className}`}
      style={{
        backgroundColor: 'var(--tenant-surface, #18181B)',
        borderColor: invalid ? undefined : 'var(--tenant-border, #27272A)',
        color: 'var(--tenant-text, #FAFAFA)',
      }}
      {...props}
    >
      {children}
    </select>
  );
}
