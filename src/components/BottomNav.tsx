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
    <div className="flex-shrink-0 border-t border-brand-500/20 bg-black/95 backdrop-blur-xl px-1 pt-2 pb-3 safe-bottom">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeScreen === tab.screen;
          return (
            <button
              key={tab.screen}
              onClick={() => onNavigate(tab.screen)}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all ${
                isActive ? 'text-brand-500' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[9px] font-semibold tracking-wide ${isActive ? 'text-brand-500' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
