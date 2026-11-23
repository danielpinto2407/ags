import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: ReactNode;
  children: ReactNode;
}

export default function AppButton({
  variant = 'primary',
  icon,
  children,
  className = '',
  ...buttonProps
}: AppButtonProps) {
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-action-hover',
    secondary: 'border border-zinc-700 text-zinc-300 hover:bg-zinc-900',
    danger: 'border border-rose-900/70 text-rose-300 hover:bg-rose-950/30',
    ghost: 'text-zinc-400 hover:bg-zinc-900 hover:text-white',
  };

  return (
    <button
      className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...buttonProps}
    >
      {icon}
      {children}
    </button>
  );
}
