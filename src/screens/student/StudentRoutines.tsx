import { useState, useSyncExternalStore } from 'react';
import { ChevronRight, CheckCircle2, Circle, MessageCircle } from 'lucide-react';
import Header from '@/components/Header';
import DaySelector from '@/components/DaySelector';
import ExerciseDetailModal from '@/components/ExerciseDetailModal';
import { fitnessRepository } from '@/data/fitnessRepository';
import type { Day, Exercise } from '@/types';

export default function StudentRoutines() {
  const [selectedDay, setSelectedDay] = useState<Day>('LUN');
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set(['LUN:ex-1', 'LUN:ex-2']));

  const toggleComplete = (id: string) => {
    const completionKey = `${selectedDay}:${id}`;
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(completionKey)) next.delete(completionKey);
      else next.add(completionKey);
      return next;
    });
  };

  const routines = useSyncExternalStore(
    fitnessRepository.subscribeToRoutines,
    fitnessRepository.getRoutinesSnapshot,
    fitnessRepository.getRoutinesSnapshot
  );
  const dayExercises = routines[selectedDay];
  const completedCount = dayExercises.filter((ex) => completed.has(`${selectedDay}:${ex.id}`)).length;
  const progress = dayExercises.length === 0 ? 0 : Math.round((completedCount / dayExercises.length) * 100);

  return (
    <div className="space-y-4">
      <Header title="Mis Rutinas" subtitle="Semana del 1-7 Sept" />

      <DaySelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />

      {/* Progress bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-400 font-medium">Progreso del día</span>
          <span className="text-xs font-bold text-brand-400">{completedCount}/{dayExercises.length} completados</span>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Exercise List */}
      <div className="space-y-2.5">
        <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide">Ejercicios — {selectedDay}</p>
        {dayExercises.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-sm font-semibold text-zinc-300">Día de descanso</p>
            <p className="text-xs text-zinc-500 mt-1">Recupera y vuelve con energía.</p>
          </div>
        )}
        {dayExercises.map((ex, i) => {
          const isDone = completed.has(`${selectedDay}:${ex.id}`);
          return (
            <div
              key={ex.id}
              className={`bg-zinc-900 p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                isDone ? 'border-brand-900/50 bg-brand-950/20' : 'border-zinc-800'
              }`}
            >
              <button
                onClick={() => toggleComplete(ex.id)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                {isDone ? (
                  <CheckCircle2 size={22} className="text-brand-500 flex-shrink-0" />
                ) : (
                  <Circle size={22} className="text-zinc-700 flex-shrink-0" />
                )}
                <div>
                  <h4 className={`text-sm font-bold ${isDone ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                    {i + 1}. {ex.name}
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    {ex.series} series • {ex.reps} • {ex.weight} • Desc: {ex.rest}
                  </p>
                </div>
              </button>
              <button
                onClick={() => setActiveExercise(ex)}
                className="bg-brand-500/10 text-brand-400 hover:bg-brand-600 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
              >
                Ver
                <ChevronRight size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* WhatsApp */}
      <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl flex items-center justify-between text-xs">
        <span className="text-emerald-400 flex items-center gap-2">
          <MessageCircle size={14} /> ¿Dudas con la técnica?
        </span>
        <button className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold">WhatsApp</button>
      </div>

      {activeExercise && (
        <ExerciseDetailModal exercise={activeExercise} onClose={() => setActiveExercise(null)} />
      )}
    </div>
  );
}
