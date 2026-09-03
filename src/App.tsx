import LoginScreen from '@/screens/LoginScreen';
import AppShell from '@/app/AppShell';
import DemoControls from '@/app/DemoControls';
import ScreenRenderer from '@/app/ScreenRenderer';
import { useAppNavigation } from '@/app/useAppNavigation';

export default function App() {
  const navigation = useAppNavigation();
  const { role, viewMode, setViewMode, handleLogin, switchRole } = navigation;

  if (!role) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="fixed top-4 right-4">
          <DemoControls viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {viewMode === 'phone' ? (
          <div className="w-full max-w-[390px] h-[720px] bg-black border-4 border-brand-500/40 rounded-[40px] p-2 shadow-neon-lg overflow-hidden relative">
            <LoginScreen onLogin={handleLogin} />
          </div>
        ) : (
          <div className="w-full max-w-[390px] bg-black border border-brand-500/30 rounded-3xl shadow-neon p-6 min-h-[600px]">
            <LoginScreen onLogin={handleLogin} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="mb-3">
        <DemoControls role={role} viewMode={viewMode} onRoleChange={switchRole} onViewModeChange={setViewMode} />
      </div>

      <AppShell navigation={navigation}>
        <ScreenRenderer navigation={navigation} />
      </AppShell>
    </div>
  );
}
