import { Home, Calendar, TrendingUp, User, Users, Dumbbell } from 'lucide-react';
import type { Screen, Role } from '@/types';

interface BottomNavProps {
  role: Role;
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function BottomNav({ role, activeScreen, onNavigate }: BottomNavProps) {
  const studentTabs: { screen: Screen; label: string; icon: typeof Home }[] = [
    { screen: 'home', label: 'Inicio', icon: Home },
    { screen: 'routines', label: 'Rutinas', icon: Calendar },
    { screen: 'progress', label: 'Progreso', icon: TrendingUp },
    { screen: 'profile', label: 'Perfil', icon: User },
  ];

  const coachTabs: { screen: Screen; label: string; icon: typeof Home }[] = [
    { screen: 'home', label: 'Dashboard', icon: Home },
    { screen: 'students', label: 'Alumnas', icon: Users },
    { screen: 'programRoutine', label: 'Rutinas', icon: Calendar },
    { screen: 'exerciseLibrary', label: 'Ejercicios', icon: Dumbbell },
    { screen: 'profile', label: 'Perfil', icon: User },
  ];

  const tabs = role === 'student' ? studentTabs : coachTabs;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed left-1/2 z-40 w-[calc(100%-24px)] max-w-[560px] -translate-x-1/2 rounded-2xl border border-brand-500/25 bg-zinc-950/90 px-1.5 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <div className="flex min-h-12 items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeScreen === tab.screen;
          return (
            <button
              key={tab.screen}
              onClick={() => onNavigate(tab.screen)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1 transition-colors ${
                isActive ? 'text-brand-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`max-w-full truncate text-[9px] font-semibold ${isActive ? 'text-brand-300' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
