import { Dumbbell, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col items-center justify-between h-full py-8 px-6">
      <div className="flex flex-col items-center mt-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center shadow-neon mb-4">
          <Dumbbell size={36} className="text-white" />
        </div>
        <span className="font-display font-extrabold tracking-[0.2em] text-[11px] text-brand-500 uppercase mb-1" style={{ textShadow: '0 0 8px rgba(255,10,120,0.6)' }}>
          AGS Glutehouse
        </span>
        <h1 className="text-3xl font-display font-extrabold text-white text-center leading-tight">
          Tu gimnasio<br />en la palma de tu mano
        </h1>
        <p className="text-sm text-zinc-500 text-center mt-2 max-w-[260px]">
          Rutinas personalizadas, seguimiento de progreso y comunicación directa con tu coach.
        </p>
      </div>

      <div className="w-full space-y-3">
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

        <p className="text-center text-[11px] text-zinc-600">
          ¿No tienes cuenta? <span className="text-brand-400 font-semibold">Regístrate</span>
        </p>
      </div>
    </div>
  );
}
