import type { ReactNode } from 'react';
import type { AppNavigation } from './useAppNavigation';
import BottomNav from '@/components/BottomNav';

interface AppShellProps {
  navigation: AppNavigation;
  children: ReactNode;
}

export default function AppShell({ navigation, children }: AppShellProps) {
  const { role, viewMode, screen, handleNavigate } = navigation;

  if (!role) return null;

  return (
    <div className={`w-full max-w-[390px] ${viewMode === 'phone' ? 'h-[720px] border-4 border-brand-500/40 rounded-[40px] shadow-neon-lg' : 'min-h-[720px] border border-brand-500/30 rounded-3xl shadow-neon'} bg-black overflow-hidden relative flex flex-col`}>
      <div className="flex-1 overflow-y-auto no-scrollbar p-5">{children}</div>
      <BottomNav role={role} activeScreen={screen} onNavigate={handleNavigate} />
    </div>
  );
}
