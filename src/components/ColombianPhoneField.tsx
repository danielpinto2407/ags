import AppInput from '@/components/AppInput';

interface ColombianPhoneFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export default function ColombianPhoneField({ id, value, onChange, disabled = false, required = false }: ColombianPhoneFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-zinc-300" htmlFor={id}>Celular de WhatsApp</label>
      <div className="flex items-stretch gap-2">
        <span className="flex shrink-0 items-center rounded-xl border px-3 text-sm font-semibold" style={{ borderColor: 'var(--tenant-border)', color: 'var(--tenant-text)', backgroundColor: 'var(--tenant-surface)' }}>+57</span>
        <AppInput
          aria-describedby={`${id}-help`}
          autoComplete="tel-national"
          className="min-w-0"
          disabled={disabled}
          id={id}
          inputMode="numeric"
          maxLength={10}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
          onPaste={(event) => {
            const digits = event.clipboardData.getData('text').replace(/\D/g, '');
            if (/^573[0-9]{9}$/.test(digits)) {
              event.preventDefault();
              onChange(digits.slice(2));
            } else if (/^3[0-9]{9}$/.test(digits)) {
              event.preventDefault();
              onChange(digits);
            }
          }}
          placeholder="3001234567"
          required={required}
          type="tel"
          value={value}
        />
      </div>
      <p className="text-xs text-zinc-500" id={`${id}-help`}>Ingresa los 10 dígitos de tu celular, comenzando por 3.</p>
    </div>
  );
}