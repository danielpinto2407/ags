import { Smartphone, Tablet } from 'lucide-react';
import LoginScreen from '@/screens/LoginScreen';
import { AppContent } from '@/app/ScreenRenderer';
import { useAppNavigation } from '@/app/useAppNavigation';

export default function App() {
  const navigation = useAppNavigation();
  const { role, viewMode, setViewMode, handleLogin, switchRole } = navigation;

  if (!role) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        {/* Demo controls */}
        <div className="fixed top-4 right-4 flex gap-1 bg-zinc-900 border border-brand-500/30 p-1 rounded-xl text-xs shadow-neon-sm">
          <button
            onClick={() => setViewMode('phone')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              viewMode === 'phone' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone size={14} />
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              viewMode === 'full' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Tablet size={14} />
          </button>
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
      {/* Demo control bar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="bg-zinc-900 border border-brand-500/30 p-1 rounded-2xl flex gap-1 text-xs shadow-neon-sm">
          <button
            onClick={() => switchRole('student')}
            className={`px-4 py-1.5 rounded-xl font-semibold transition-all ${
              role === 'student' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Vista Alumna
          </button>
          <button
            onClick={() => switchRole('coach')}
            className={`px-4 py-1.5 rounded-xl font-semibold transition-all ${
              role === 'coach' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Vista Coach
          </button>
        </div>
        <div className="bg-zinc-900 border border-brand-500/30 p-1 rounded-2xl flex gap-1 text-xs shadow-neon-sm">
          <button
            onClick={() => setViewMode('phone')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              viewMode === 'phone' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone size={14} />
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              viewMode === 'full' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Tablet size={14} />
          </button>
        </div>
      </div>

      <AppContent navigation={navigation} />
    </div>
  );
}
