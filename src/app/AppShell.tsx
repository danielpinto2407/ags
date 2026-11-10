import type { ReactNode } from 'react';
import type { AppNavigation } from './useAppNavigation';
import BottomNav from '@/components/BottomNav';

interface AppShellProps {
  navigation: AppNavigation;
  children: ReactNode;
}

export default function AppShell({ navigation, children }: AppShellProps) {
  const { role, screen, handleNavigate } = navigation;

  if (!role) return null;

  return (
    <div className="tenant-app min-h-screen w-full overflow-hidden relative flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar p-5">{children}</div>
      <BottomNav role={role} activeScreen={screen} onNavigate={handleNavigate} />
    </div>
  );
}
