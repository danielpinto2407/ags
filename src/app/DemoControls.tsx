import { Smartphone, Tablet } from 'lucide-react';
import type { ViewMode } from './useAppNavigation';

interface DemoControlsProps {
  role?: 'student' | 'coach' | null;
  viewMode: ViewMode;
  onRoleChange?: (role: 'student' | 'coach') => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function DemoControls({
  role,
  viewMode,
  onRoleChange,
  onViewModeChange,
}: DemoControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {onRoleChange && (
        <div className="bg-zinc-900 border border-brand-500/30 p-1 rounded-2xl flex gap-1 text-xs shadow-neon-sm">
          <button
            onClick={() => onRoleChange('student')}
            className={`px-4 py-1.5 rounded-xl font-semibold transition-all ${
              role === 'student' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Vista Alumna
          </button>
          <button
            onClick={() => onRoleChange('coach')}
            className={`px-4 py-1.5 rounded-xl font-semibold transition-all ${
              role === 'coach' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Vista Coach
          </button>
        </div>
      )}
      <div className="bg-zinc-900 border border-brand-500/30 p-1 rounded-2xl flex gap-1 text-xs shadow-neon-sm">
        <button
          aria-label="Vista móvil"
          onClick={() => onViewModeChange('phone')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            viewMode === 'phone' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Smartphone size={14} />
        </button>
        <button
          aria-label="Vista completa"
          onClick={() => onViewModeChange('full')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            viewMode === 'full' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Tablet size={14} />
        </button>
      </div>
    </div>
  );
}
