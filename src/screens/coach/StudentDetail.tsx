import { ArrowLeft, Flame, Calendar, Target, Weight, Activity, MessageCircle, ChevronRight } from 'lucide-react';
import { fitnessRepository } from '@/data/fitnessRepository';
import type { Student } from '@/types';

interface StudentDetailProps {
  student: Student;
  onBack: () => void;
}

export default function StudentDetail({ student, onBack }: StudentDetailProps) {
  const exercises = fitnessRepository.getExercises();
  const progress = fitnessRepository.getProgress();
  const stats = [
    { label: 'Racha', value: `${student.streak} días`, icon: Flame, color: 'text-orange-400' },
    { label: 'Cumplimiento', value: `${student.weeklyProgress}%`, icon: Target, color: 'text-emerald-400' },
    { label: 'Peso', value: student.weight, icon: Weight, color: 'text-brand-400' },
    { label: 'Edad', value: `${student.age} años`, icon: Activity, color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={16} className="text-zinc-400" />
        </button>
        <span className="font-display font-extrabold tracking-[0.15em] text-[10px] text-brand-500 uppercase">AGS Glutehouse</span>
      </div>

      {/* Student Profile Card */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-800/50 flex items-center justify-center text-3xl">
            {student.avatar}
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-white">{student.name}</h2>
            <p className="text-xs text-zinc-500">{student.goal}</p>
            <span className="inline-block mt-1 text-[10px] bg-brand-950/50 text-brand-400 px-2 py-0.5 rounded-full font-semibold border border-brand-900/50">
              Plan {student.plan}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-2">
                <Icon size={16} className={stat.color} />
                <div>
                  <p className="text-sm font-bold text-white">{stat.value}</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wide">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Progreso semanal</p>
          <span className="text-xs text-zinc-400">{student.lastActive}</span>
        </div>
        <div className="flex justify-between items-end gap-2 h-24">
          {progress.map((entry) => {
            const height = entry.total > 0 ? (entry.completed / entry.total) * 100 : 0;
            return (
              <div key={entry.day} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full h-full flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      entry.completed === entry.total && entry.total > 0 ? 'bg-brand-500' : 'bg-zinc-700'
                    }`}
                    style={{ height: `${height}%`, minHeight: entry.total > 0 ? '8px' : '2px' }}
                  />
                </div>
                <span className="text-[9px] text-zinc-600 font-medium">{entry.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Routine */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Rutina actual</p>
          <button className="text-xs text-brand-400 hover:text-brand-300">Editar</button>
        </div>
        <div className="space-y-2">
          {exercises.slice(0, 4).map((ex, i) => (
            <div key={ex.id} className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <span className="text-xl">{ex.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-zinc-100">{i + 1}. {ex.name}</p>
                <p className="text-[11px] text-zinc-500">{ex.series} series • {ex.reps} • {ex.rest}</p>
              </div>
              <ChevronRight size={16} className="text-zinc-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="flex items-center justify-center gap-2 p-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-bold transition-colors">
          <Calendar size={16} />
          Programar
        </button>
        <button className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-bold transition-colors">
          <MessageCircle size={16} />
          Mensaje
        </button>
      </div>
    </div>
  );
}
