import { Dumbbell, Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface LoginScreenProps {
  tenantName: string;
  logoUrl: string | null;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (email: string, password: string) => Promise<void>;
}

export default function LoginScreen({
  tenantName,
  logoUrl,
  error,
  isSubmitting,
  onSubmit,
}: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit(email.trim(), password);
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-10 px-6 py-10 sm:gap-12">
      <div className="flex w-full max-w-md flex-col items-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-neon">
          {logoUrl && !logoFailed ? (
            <img
              src={logoUrl}
              alt={`Logo de ${tenantName}`}
              onError={() => setLogoFailed(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <Dumbbell size={36} className="text-white" />
          )}
        </div>
        <span className="font-display font-extrabold tracking-[0.2em] text-[11px] text-brand-500 uppercase mb-1" style={{ textShadow: '0 0 8px color-mix(in srgb, var(--tenant-primary) 30%, transparent)' }}>
          {tenantName}
        </span>
        <p className="text-sm text-zinc-500 text-center mt-2 max-w-[260px]">
          Rutinas personalizadas, seguimiento de progreso y comunicación directa con tu coach.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3">
        <div>
          <label htmlFor="login-email" className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 pr-11 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
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

        {error && (
          <p role="alert" aria-live="polite" className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 font-bold rounded-2xl text-sm transition-all bg-brand-500 hover:bg-brand-400 text-white shadow-neon disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </button>

      </form>
    </main>
  );
}
