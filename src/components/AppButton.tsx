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
    primary: 'app-button app-button-primary',
    secondary: 'app-button app-button-secondary',
    danger: 'app-button app-button-danger',
    ghost: 'app-button app-button-ghost',
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
