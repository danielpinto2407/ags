import { Settings, ChevronRight, Bell, Users, Star, LogOut, Heart, Award, Calendar } from 'lucide-react';
import Header from '@/components/Header';
import { fitnessRepository } from '@/data/fitnessRepository';

export default function CoachProfile() {
  const students = fitnessRepository.getStudents();
  const menuItems = [
    { icon: Users, label: 'Gestionar alumnas', value: `${students.length} alumnas` },
    { icon: Calendar, label: 'Plantillas de rutina', value: '4 plantillas' },
    { icon: Bell, label: 'Notificaciones', value: 'Activadas' },
    { icon: Star, label: 'Reseñas', value: '4.9 ★' },
    { icon: Award, label: 'Certificaciones', value: '3' },
    { icon: Settings, label: 'Configuración', value: '' },
  ];

  return (
    <div className="space-y-5">
      <Header title="Mi Perfil" showBell={false} />

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-800/50 flex items-center justify-center text-3xl">
            💪
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-white">Andrea Gómez</h2>
            <p className="text-xs text-zinc-500">Especialista en Glúteos</p>
            <span className="inline-block mt-1 text-[10px] bg-brand-950/50 text-brand-400 px-2 py-0.5 rounded-full font-semibold border border-brand-900/50">
              Coach Certificada
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-800">
          <div className="text-center">
            <p className="text-xl font-display font-bold text-white">{students.length}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Alumnas</p>
          </div>
          <div className="text-center border-x border-zinc-800">
            <p className="text-xl font-display font-bold text-white">156</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Rutinas</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-display font-bold text-white">4.9</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Rating</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800/50 transition-colors text-left"
            >
              <Icon size={18} className="text-zinc-400 flex-shrink-0" />
              <span className="text-sm text-zinc-200 flex-1">{item.label}</span>
              {item.value && <span className="text-[11px] text-zinc-500">{item.value}</span>}
              <ChevronRight size={16} className="text-zinc-700" />
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <button className="w-full flex items-center justify-center gap-2 p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-brand-400 hover:bg-brand-950/30 transition-colors text-sm font-semibold">
        <LogOut size={16} />
        Cerrar Sesión
      </button>

      <p className="text-center text-[10px] text-zinc-700 flex items-center justify-center gap-1 pb-2">
        AGS Glutehouse v1.0 • Hecho con <Heart size={10} className="text-brand-700" />
      </p>
    </div>
  );
}
