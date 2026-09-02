import { Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  showBell?: boolean;
  onBellClick?: () => void;
}

export default function Header({ title, subtitle, showLogo = true, showBell = true, onBellClick }: HeaderProps) {
  return (
    <div className="flex justify-between items-start mb-5">
      <div>
        {showLogo && (
          <span className="font-display font-extrabold tracking-[0.15em] text-[10px] text-brand-400 uppercase block mb-0.5" style={{ textShadow: '0 0 8px rgba(217,70,239,0.5)' }}>
            AGS Glutehouse
          </span>
        )}
        <h1 className="text-2xl font-display font-bold text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {showBell && (
        <button
          onClick={onBellClick}
          className="relative w-9 h-9 rounded-full bg-zinc-900 border border-brand-500/30 flex items-center justify-center hover:bg-zinc-800 transition-colors"
        >
          <Bell size={16} className="text-zinc-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" style={{ boxShadow: '0 0 6px rgba(217,70,239,0.8)' }} />
        </button>
      )}
    </div>
  );
}
