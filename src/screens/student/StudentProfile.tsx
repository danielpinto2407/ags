import { Settings, Bell, Lock, HelpCircle, LogOut, Heart, Target, Calendar } from 'lucide-react';
import Header from '@/components/Header';
import type { Profile } from '@/domain/profile';

interface StudentProfileProps {
  profile: Profile;
  onLogout: () => void;
}

export default function StudentProfile({ profile, onLogout }: StudentProfileProps) {
  const menuItems = [
    { icon: Bell, label: 'Notificaciones', value: 'Sin configurar' },
    { icon: Target, label: 'Mi objetivo', value: 'Sin configurar' },
    { icon: Calendar, label: 'Mi plan', value: profile.role === 'user_personalized' ? 'Personalizado' : 'No disponible' },
    { icon: Lock, label: 'Privacidad y seguridad', value: '' },
    { icon: HelpCircle, label: 'Ayuda y soporte', value: '' },
    { icon: Settings, label: 'Configuración', value: '' },
  ];

  return (
    <div className="space-y-5">
      <Header title="Mi Perfil" showBell={false} />

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-800/50 flex items-center justify-center text-3xl">
            👩
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-white">{profile.full_name}</h2>
            <span className="inline-block mt-1 text-[10px] bg-brand-950/50 text-brand-400 px-2 py-0.5 rounded-full font-semibold border border-brand-900/50">
              {profile.role === 'user_personalized' ? 'Plan Personalizado' : 'Perfil'}
            </span>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <p className="text-xs leading-relaxed text-zinc-500">
            Tu progreso y medidas aparecerán aquí cuando haya registros disponibles.
          </p>
        </div>
      </div>

      {/* Coach Info */}
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600/20 text-xl">💪</div>
        <div>
          <p className="text-xs text-zinc-500">Tu Coach</p>
          <p className="text-sm font-bold text-white">Información no disponible</p>
        </div>
      </div>

      {/* Menu */}
      <div className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              aria-disabled="true"
              className="flex w-full cursor-not-allowed items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5 text-left opacity-75"
              disabled
              type="button"
            >
              <Icon size={18} className="text-zinc-400 flex-shrink-0" />
              <span className="text-sm text-zinc-200 flex-1">{item.label}</span>
              {item.value && <span className="text-[11px] text-zinc-500">{item.value}</span>}
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-brand-400 hover:bg-brand-950/30 transition-colors text-sm font-semibold">
        <LogOut size={16} />
        Cerrar Sesión
      </button>

      <p className="text-center text-[10px] text-zinc-700 flex items-center justify-center gap-1 pb-2">
        AGS Glutehouse v1.0 • Hecho con <Heart size={10} className="text-brand-700" />
      </p>
    </div>
  );
}
