import { Dumbbell, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface LoginScreenProps {
  onLogin: () => void;
  tenantName: string;
  logoUrl: string | null;
}

export default function LoginScreen({ onLogin, tenantName, logoUrl }: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

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
        <span className="font-display font-extrabold tracking-[0.2em] text-[11px] text-brand-500 uppercase mb-1" style={{ textShadow: '0 0 8px rgba(255,10,120,0.6)' }}>
          {tenantName}
        </span>
        <p className="text-sm text-zinc-500 text-center mt-2 max-w-[260px]">
          Rutinas personalizadas, seguimiento de progreso y comunicación directa con tu coach.
        </p>
      </div>

      <div className="w-full max-w-md space-y-3">
        <div>
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
            Correo electrónico
          </label>
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold">
              Contraseña
            </label>
            <button type="button" className="text-[11px] text-brand-400 font-semibold hover:text-brand-300">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
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

        <button
          onClick={onLogin}
          className="w-full py-3.5 font-bold rounded-2xl text-sm transition-all bg-brand-500 hover:bg-brand-400 text-white shadow-neon"
        >
          Ingresar
        </button>

        {/* <p className="text-center text-[11px] text-zinc-600">
          ¿No tienes cuenta? <span className="text-brand-400 font-semibold">Regístrate</span>
        </p> */}
      </div>
    </main>
  );
}
