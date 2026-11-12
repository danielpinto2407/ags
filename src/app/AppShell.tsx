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
    <div className="tenant-app relative min-h-screen w-full overflow-hidden">
      <main data-app-scroll-container className="h-[100dvh] overflow-y-auto px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 no-scrollbar">
        {children}
      </main>
      <BottomNav role={role} activeScreen={screen} onNavigate={handleNavigate} />
    </div>
  );
}
