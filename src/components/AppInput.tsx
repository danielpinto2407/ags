import type { InputHTMLAttributes } from 'react';

interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export default function AppInput({ invalid = false, className = '', ...props }: AppInputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${invalid ? 'border-rose-500' : 'border-zinc-800 focus:border-brand-500'} ${className}`}
      style={{
        backgroundColor: 'var(--tenant-surface, #18181B)',
        borderColor: invalid ? undefined : 'var(--tenant-border, #27272A)',
        color: 'var(--tenant-text, #FAFAFA)',
      }}
      {...props}
    />
  );
}
