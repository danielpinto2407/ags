import LoginScreen from '@/screens/LoginScreen';
import AppShell from '@/app/AppShell';
import ScreenRenderer from '@/app/ScreenRenderer';
import { useAppNavigation } from '@/app/useAppNavigation';

export default function App() {
  const navigation = useAppNavigation();
  const { role, handleLogin } = navigation;

  if (!role) {
    return <div className="min-h-screen w-full bg-black"><LoginScreen onLogin={handleLogin} /></div>;
  }

  return (
    <div className="min-h-screen w-full bg-black">
      <AppShell navigation={navigation}>
        <ScreenRenderer navigation={navigation} />
      </AppShell>
    </div>
  );
}
