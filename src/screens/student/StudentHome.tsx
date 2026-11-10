import { Flame, TrendingUp, ChevronRight, MessageCircle, Dumbbell } from 'lucide-react';
import Header from '@/components/Header';
import { fitnessRepository } from '@/data/fitnessRepository';
import type { Screen } from '@/types';
import type { Profile } from '@/domain/profile';

interface StudentHomeProps {
  onNavigate: (screen: Screen) => void;
  profile: Profile;
}

export default function StudentHome({ onNavigate, profile }: StudentHomeProps) {
  const todayExercises = fitnessRepository.getRoutine('LUN').slice(0, 3);
  const completedToday = 2;
  const totalToday = todayExercises.length;
  const progress = Math.round((completedToday / totalToday) * 100);
  const streak = 12;

  return (
    <div className="space-y-5">
      <Header title={`Hola, ${profile.full_name}`} subtitle="Tu espacio personal" />

      {/* Streak Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 shadow-neon">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-12 -mt-12" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Flame size={16} className="text-orange-300" />
              <span className="text-[11px] font-semibold text-brand-100 uppercase tracking-wide">Racha actual</span>
            </div>
            <p className="text-3xl font-display font-extrabold text-white">{streak} días</p>
            <p className="text-xs text-brand-100 mt-0.5">¡Sigue así, vas genial!</p>
          </div>
          <div className="text-5xl">🔥</div>
        </div>
      </div>

      {/* Today's Progress Ring */}
      <div className="bg-zinc-900 border border-brand-500/20 rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Rutina de Hoy</p>
            <p className="text-lg font-display font-bold text-white">Lunes — Glúteos</p>
          </div>
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#27272a" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="28" fill="none" stroke="#d946ef" strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 4px rgba(217,70,239,0.6))' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{progress}%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-4">
          <span className="flex items-center gap-1"><Dumbbell size={12} /> {completedToday}/{totalToday} ejercicios</span>
          <span className="text-zinc-700">•</span>
          <span>~45 min</span>
        </div>
        <button
          onClick={() => onNavigate('routines')}
          className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-neon-sm"
        >
          Continuar Rutina
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekly Progress Mini Chart */}
      <div className="bg-zinc-900 border border-brand-500/20 rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Esta Semana</p>
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <TrendingUp size={12} /> +15%
          </span>
        </div>
        <div className="flex justify-between items-end gap-2 h-24">
          {fitnessRepository.getProgress().map((entry) => {
            const height = entry.total > 0 ? (entry.completed / entry.total) * 100 : 0;
            return (
              <div key={entry.day} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full h-full flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all ${entry.completed === entry.total && entry.total > 0 ? 'bg-brand-500' : 'bg-zinc-700'}`}
                    style={{ height: `${height}%`, minHeight: entry.total > 0 ? '8px' : '2px' }}
                  />
                </div>
                <span className="text-[9px] text-zinc-600 font-medium">{entry.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Achievement */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Logros Recientes</p>
          <button onClick={() => onNavigate('progress')} className="text-xs text-brand-400 hover:text-brand-300">Ver todos</button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {fitnessRepository.getAchievements().filter(a => a.unlocked).slice(0, 3).map((ach) => (
            <div key={ach.id} className="flex-shrink-0 w-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
              <div className="text-3xl mb-1">{ach.icon}</div>
              <p className="text-[10px] font-bold text-white">{ach.title}</p>
              <p className="text-[9px] text-zinc-500 mt-0.5">{ach.date}</p>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Contact */}
      <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
            <MessageCircle size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-emerald-400 font-semibold">¿Dudas con la técnica?</p>
            <p className="text-[11px] text-emerald-600">Escríbele a tu coach</p>
          </div>
        </div>
        <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-500 transition-colors">
          WhatsApp
        </button>
      </div>
    </div>
  );
}
