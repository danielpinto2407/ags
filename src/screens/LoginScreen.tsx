import { Dumbbell, Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import PasswordRecoveryScreen from '@/screens/PasswordRecoveryScreen';
import AppButton from '@/components/AppButton';
import FeedbackMessage from '@/components/FeedbackMessage';
import AppInput from '@/components/AppInput';

interface LoginScreenProps {
  tenantName: string;
  description: string;
  logoUrl: string | null;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (email: string, password: string) => Promise<void>;
  onRequestPasswordRecovery: (email: string) => Promise<void>;
  onCancelPasswordRecovery: () => Promise<void>;
}

export default function LoginScreen({
  tenantName,
  description,
  logoUrl,
  error,
  isSubmitting,
  onSubmit,
  onRequestPasswordRecovery,
  onCancelPasswordRecovery,
}: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit(email.trim(), password);
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-10 px-6 py-10 sm:gap-12">
      <div className="flex w-full max-w-md flex-col items-center">
        <div className="mb-5 flex h-28 w-full max-w-64 items-center justify-center overflow-hidden sm:h-32">
          {logoUrl && !logoFailed ? (
            <img
              src={logoUrl}
              alt={`Logo de ${tenantName}`}
              onError={() => setLogoFailed(true)}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <Dumbbell aria-hidden="true" size={48} className="text-brand-500" />
          )}
        </div>
        <span className="font-display font-extrabold tracking-[0.2em] text-[11px] text-brand-500 uppercase mb-1" style={{ textShadow: '0 0 8px color-mix(in srgb, var(--tenant-primary) 30%, transparent)' }}>
          {tenantName}
        </span>
        {description.trim() && (
          <p className="mt-2 max-w-[320px] text-center text-sm text-zinc-500">{description}</p>
        )}
      </div>

      {showRecovery ? (
        <PasswordRecoveryScreen
          gymName={tenantName}
          mode="request"
          onRequest={onRequestPasswordRecovery}
          onReturnToSignIn={async () => {
            await onCancelPasswordRecovery();
            setShowRecovery(false);
          }}
        />
      ) : (
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3">
        <div>
          <label htmlFor="login-email" className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
            Correo electrónico
          </label>
          <AppInput
            id="login-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="correo@ejemplo.com"
            className="rounded-2xl px-4 py-3"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
            Contraseña
          </label>
          <div className="relative">
            <AppInput
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="rounded-2xl px-4 py-3 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-brand-400 transition-colors"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <FeedbackMessage kind="error" message={error} />}

        <AppButton
          type="submit"
          disabled={isSubmitting}
          variant="primary"
          className="w-full shadow-neon"
        >
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </AppButton>
        <AppButton
          variant="ghost"
          className="w-full"
          disabled={isSubmitting}
          onClick={() => setShowRecovery(true)}
          type="button"
        >
          Olvidé mi contraseña
        </AppButton>
      </form>
      )}
    </main>
  );
}
