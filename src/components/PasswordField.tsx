import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  minLength?: number;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  describedBy?: string;
  invalid?: boolean;
}

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  required = true,
  autoFocus = false,
  disabled = false,
  describedBy,
  invalid = false,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--tenant-text)' }} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className="w-full rounded-xl border px-3.5 py-3 pr-12 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            backgroundColor: 'var(--tenant-surface, #FFF9F6)',
            borderColor: invalid ? 'var(--tenant-secondary, #963D5B)' : 'var(--tenant-border, #E5D8D2)',
            color: 'var(--tenant-text, #2B2528)',
            colorScheme: 'light',
          }}
          disabled={disabled}
          id={id}
          minLength={minLength}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center"
          style={{ color: 'var(--tenant-muted)' }}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
