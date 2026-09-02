import { useState, useSyncExternalStore } from 'react';
import { Plus, Trash2, GripVertical, Save, X, Check } from 'lucide-react';
import Header from '@/components/Header';
import DaySelector from '@/components/DaySelector';
import { fitnessRepository } from '@/data/fitnessRepository';
import type { Day, Exercise } from '@/types';

interface ExerciseConfig {
  reps: string;
  weight: string;
  workDuration: string;
  rest: string;
  series: number;
}

export default function CoachProgramRoutine() {
  const [selectedDay, setSelectedDay] = useState<Day>('LUN');
  const routines = useSyncExternalStore(
    fitnessRepository.subscribeToRoutines,
    fitnessRepository.getRoutinesSnapshot,
    fitnessRepository.getRoutinesSnapshot
  );
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(() => fitnessRepository.getStudents()[0]);
  const [pendingExercise, setPendingExercise] = useState<Exercise | null>(null);
  const [config, setConfig] = useState<ExerciseConfig>({
    reps: '',
    weight: '',
    workDuration: '',
    rest: '',
    series: 3,
  });

  const removeExercise = (id: string) => {
    const nextRoutines = {
      ...routines,
      [selectedDay]: routines[selectedDay].filter((exercise) => exercise.id !== id),
    };
    fitnessRepository.saveRoutines(nextRoutines);
  };

  const selectExercise = (ex: Exercise) => {
    setPendingExercise(ex);
    setConfig({
      reps: ex.reps,
      weight: ex.weight,
      workDuration: ex.workDuration || '',
      rest: ex.rest,
      series: ex.series,
    });
  };

  const confirmAddExercise = () => {
    if (!pendingExercise) return;
    const newEx: Exercise = {
      ...pendingExercise,
      id: `ex-${Date.now()}`,
      reps: config.reps || pendingExercise.reps,
      weight: config.weight || pendingExercise.weight,
      workDuration: config.workDuration || undefined,
      rest: config.rest || pendingExercise.rest,
      series: config.series || pendingExercise.series,
    };
    fitnessRepository.saveRoutines({
      ...routines,
      [selectedDay]: [...routines[selectedDay], newEx],
    });
    setPendingExercise(null);
    setShowAddSheet(false);
  };

  const exercises = routines[selectedDay];
  const availableExercises = fitnessRepository.getExercises().filter(
    (ex) => !exercises.some((exercise) => exercise.name === ex.name)
  );

  return (
    <div className="space-y-4">
      <Header title="Programar Rutina" subtitle="Asigna ejercicios por día" />

      {/* Student Selector */}
      <div>
        <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">Alumna</label>
        <div className="relative">
          <select
            value={selectedStudent.id}
            onChange={(e) => setSelectedStudent(fitnessRepository.getStudents().find(s => s.id === e.target.value)!)}
            className="w-full appearance-none bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-sm text-zinc-200 focus:outline-none focus:border-brand-500 transition-colors pr-10"
          >
            {fitnessRepository.getStudents().map((s) => (
              <option key={s.id} value={s.id}>{s.avatar} {s.name} ({s.plan})</option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs pointer-events-none">▼</span>
        </div>
      </div>

      <DaySelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />

      {/* Exercise List */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-xs text-zinc-500 font-medium">
            Rutina — {selectedDay} ({exercises.length} ejercicios)
          </p>
          <button
            onClick={() => setShowAddSheet(true)}
            className="flex items-center gap-1 text-xs bg-brand-600 hover:bg-brand-500 text-white px-2.5 py-1.5 rounded-xl font-semibold transition-colors"
          >
            <Plus size={14} />
            Añadir
          </button>
        </div>

        {exercises.map((ex, i) => (
          <div key={ex.id} className="bg-zinc-900 p-3.5 rounded-2xl border border-zinc-800 flex items-center gap-3 group">
            <GripVertical size={16} className="text-zinc-700 flex-shrink-0 cursor-grab" />
            <span className="text-xl flex-shrink-0">{ex.emoji}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-zinc-100 truncate">{i + 1}. {ex.name}</h4>
              <p className="text-[11px] text-zinc-500">
                {ex.series} series • {ex.reps} • {ex.weight} • Desc: {ex.rest}
                {ex.workDuration && ` • Trabajo: ${ex.workDuration}`}
              </p>
            </div>
            <button
              onClick={() => removeExercise(ex.id)}
              className="text-zinc-600 hover:text-brand-500 p-1.5 rounded-lg hover:bg-brand-950/30 transition-colors flex-shrink-0"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        {exercises.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
            <p className="text-sm text-zinc-500">No hay ejercicios asignados</p>
            <button
              onClick={() => setShowAddSheet(true)}
              className="mt-2 text-xs text-brand-400 hover:text-brand-300 font-semibold"
            >
              + Añadir primer ejercicio
            </button>
          </div>
        )}
      </div>

      {/* Save Button */}
      <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-2xl text-sm transition-all shadow-neon">
        <Save size={16} />
        Guardar Rutina
      </button>

      {/* Add Exercise Bottom Sheet */}
      {showAddSheet && !pendingExercise && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in">
          <div className="w-full max-w-[390px] bg-zinc-900 border border-zinc-800 rounded-t-[32px] p-5 animate-slide-up max-h-[70vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-lg text-white">Biblioteca de Ejercicios</h3>
              <button
                onClick={() => setShowAddSheet(false)}
                className="text-zinc-400 hover:text-white bg-zinc-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors text-sm"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {availableExercises.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">Todos los ejercicios ya están asignados</p>
              ) : (
                availableExercises.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => selectExercise(ex)}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-2xl hover:bg-zinc-800/50 transition-colors text-left"
                  >
                    <span className="text-xl">{ex.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zinc-100">{ex.name}</p>
                      <p className="text-[11px] text-zinc-500">{ex.muscles} • {ex.difficulty}</p>
                    </div>
                    <Plus size={18} className="text-brand-400 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configure Exercise Bottom Sheet */}
      {showAddSheet && pendingExercise && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in">
          <div className="w-full max-w-[390px] bg-zinc-900 border border-zinc-800 rounded-t-[32px] p-5 animate-slide-up max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{pendingExercise.emoji}</span>
                <div>
                  <h3 className="font-display font-bold text-base text-white">{pendingExercise.name}</h3>
                  <p className="text-[11px] text-zinc-500">{pendingExercise.muscles}</p>
                </div>
              </div>
              <button
                onClick={() => setPendingExercise(null)}
                className="text-zinc-400 hover:text-white bg-zinc-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Config Form */}
            <div className="space-y-3">
              {/* Series */}
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">Series</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfig((c) => ({ ...c, series: Math.max(1, c.series - 1) }))}
                    className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-lg flex items-center justify-center hover:bg-zinc-700 transition-colors flex-shrink-0"
                  >
                    −
                  </button>
                  <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 text-center text-sm font-bold text-white">
                    {config.series}
                  </div>
                  <button
                    onClick={() => setConfig((c) => ({ ...c, series: Math.min(10, c.series + 1) }))}
                    className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-lg flex items-center justify-center hover:bg-zinc-700 transition-colors flex-shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Reps */}
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">Repeticiones</label>
                <input
                  type="text"
                  value={config.reps}
                  onChange={(e) => setConfig((c) => ({ ...c, reps: e.target.value }))}
                  placeholder="Ej: 12-15 reps"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              {/* Weight */}
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">Peso</label>
                <input
                  type="text"
                  value={config.weight}
                  onChange={(e) => setConfig((c) => ({ ...c, weight: e.target.value }))}
                  placeholder="Ej: 40 kg o Peso corporal"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              {/* Work Duration */}
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
                  Duración del trabajo <span className="text-zinc-600 normal-case">(si aplica)</span>
                </label>
                <input
                  type="text"
                  value={config.workDuration}
                  onChange={(e) => setConfig((c) => ({ ...c, workDuration: e.target.value }))}
                  placeholder="Ej: 45 seg (dejar vacío si no aplica)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              {/* Rest Duration */}
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">Duración del descanso</label>
                <input
                  type="text"
                  value={config.rest}
                  onChange={(e) => setConfig((c) => ({ ...c, rest: e.target.value }))}
                  placeholder="Ej: 90s"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* Confirm */}
            <button
              onClick={confirmAddExercise}
              className="w-full mt-5 flex items-center justify-center gap-2 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-2xl text-sm transition-all shadow-neon"
            >
              <Check size={16} />
              Confirmar Ejercicio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
