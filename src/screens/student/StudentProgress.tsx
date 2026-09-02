import { TrendingUp, Award, Calendar, Target, Flame } from 'lucide-react';
import Header from '@/components/Header';
import { fitnessRepository } from '@/data/fitnessRepository';

export default function StudentProgress() {
  const progress = fitnessRepository.getProgress();
  const achievements = fitnessRepository.getAchievements();
  const totalCompleted = progress.reduce((sum, p) => sum + p.completed, 0);
  const totalPossible = progress.reduce((sum, p) => sum + p.total, 0);
  const weeklyPct = Math.round((totalCompleted / totalPossible) * 100);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const stats = [
    { label: 'Racha', value: '12 días', icon: Flame, color: 'text-orange-400' },
    { label: 'Sesiones', value: '28', icon: Calendar, color: 'text-brand-400' },
    { label: 'Cumplimiento', value: `${weeklyPct}%`, icon: Target, color: 'text-emerald-400' },
    { label: 'Logros', value: `${unlockedCount}/6`, icon: Award, color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-5">
      <Header title="Mi Progreso" subtitle="Septiembre 2026" showBell={false} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={stat.color} />
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-semibold">{stat.label}</span>
              </div>
              <p className="text-2xl font-display font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Weekly Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Semanal</p>
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <TrendingUp size={12} /> +15% vs semana pasada
          </span>
        </div>
        <div className="flex justify-between items-end gap-2 h-32">
          {progress.map((entry) => {
            const height = entry.total > 0 ? (entry.completed / entry.total) * 100 : 0;
            return (
              <div key={entry.day} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[9px] text-zinc-500 font-bold">
                  {entry.total > 0 ? `${entry.completed}/${entry.total}` : '—'}
                </span>
                <div className="w-full h-full flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      entry.completed === entry.total && entry.total > 0
                        ? 'bg-gradient-to-t from-brand-600 to-brand-400'
                        : entry.total > 0
                        ? 'bg-zinc-600'
                        : 'bg-zinc-800'
                    }`}
                    style={{ height: `${height}%`, minHeight: entry.total > 0 ? '8px' : '2px' }}
                  />
                </div>
                <span className="text-[10px] text-zinc-600 font-medium">{entry.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold mb-3">Logros</p>
        <div className="space-y-2.5">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                ach.unlocked
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-zinc-950 border-zinc-900 opacity-60'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                ach.unlocked ? 'bg-zinc-800' : 'bg-zinc-900 grayscale'
              }`}>
                {ach.icon}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${ach.unlocked ? 'text-white' : 'text-zinc-500'}`}>
                  {ach.title}
                </p>
                <p className="text-[11px] text-zinc-500">{ach.description}</p>
              </div>
              {ach.unlocked && ach.date && (
                <span className="text-[10px] text-brand-400 font-semibold bg-brand-950/50 px-2 py-1 rounded-lg">
                  {ach.date}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
