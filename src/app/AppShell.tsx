import type { ReactNode } from 'react';
import type { AppNavigation } from './useAppNavigation';
import BottomNav from '@/components/BottomNav';
import StudentWhatsappContact from '@/components/StudentWhatsappContact';

interface AppShellProps {
  navigation: AppNavigation;
  children: ReactNode;
}

export default function AppShell({ navigation, children }: AppShellProps) {
  const { role, screen, handleNavigate } = navigation;

  if (!role) return null;

  return (
    <div className="tenant-app relative min-h-screen w-full overflow-hidden">
      <main
        data-app-scroll-container
        className={`h-[100dvh] overflow-y-auto no-scrollbar ${screen === 'training' ? 'px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4' : 'px-5 pb-[calc(10rem+env(safe-area-inset-bottom))] pt-5'}`}
      >
        {children}
      </main>
      {screen !== 'training' && <BottomNav role={role} activeScreen={screen} onNavigate={handleNavigate} />}
      {role === 'student' && <StudentWhatsappContact training={screen === 'training'} />}
    </div>
  );
}
