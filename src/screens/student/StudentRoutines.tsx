import { useState } from 'react';
import { CalendarDays, Dumbbell, LoaderCircle, Save } from 'lucide-react';
import Header from '@/components/Header';
import DateField from '@/components/DateField';
import ExerciseVideoPreview from '@/components/ExerciseVideoPreview';
import { useStudentRoutineAssignment } from '@/app/useStudentRoutineAssignment';
import type { Profile } from '@/domain/profile';
import { exerciseEquipmentLabels, exerciseFocusLabels, exerciseMovementLabels, formatMuscleName } from '@/domain/exerciseDefinition';
import { formatLocalDate } from '@/domain/localDate';
import { getCompletedSetCount, validateActualExercisePerformance } from '@/domain/workoutExecution';
import type { ActualExercisePerformance } from '@/domain/workoutExecution';
import { calculateCycleExerciseTarget } from '@/domain/trainingCycle';

interface StudentRoutinesProps {
  profile: Profile;
}

export default function StudentRoutines({ profile }: StudentRoutinesProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [selectedDayPosition, setSelectedDayPosition] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, ActualExercisePerformance>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tenantId = profile.tenant_id ?? '';
  const { state, reload, savePerformance: saveRoutinePerformance } = useStudentRoutineAssignment(profile.id, tenantId, selectedDate);
  const assignments = state.assignments;
  const hasSingleDay = assignments.some(({ programMode }) => programMode === 'SINGLE_DAY');
  const priorityAssignment = assignments.find(({ programMode }) => programMode === 'SINGLE_DAY') ?? null;
  const assignment = priorityAssignment
    ?? assignments.find(({ id }) => id === selectedAssignmentId)
    ?? assignments.find(({ programMode }) => programMode === 'CYCLE')
    ?? state.assignment;
  const selectedDay = assignment?.days.find(({ position }) => position === selectedDayPosition)
    ?? assignment?.days[0];
  const execution = state.execution
    && state.execution.assignmentId === assignment?.id
    && state.execution.cycleDayId === selectedDay?.id
    ? state.execution
    : null;
  const todayUtc = new Date().toISOString().slice(0, 10);
  const executionEditable = selectedDate === todayUtc && (!execution || execution.status === 'IN_PROGRESS');
  const slotHistory = selectedDay ? state.cycleSlotHistory[selectedDay.id] : undefined;
  const cycleSlotAttemptsExhausted = Boolean(
    assignment?.programMode === 'CYCLE'
    && !execution
    && (slotHistory?.attemptCount ?? 0) >= assignment.additionalCycleRepeats + 1
  );

  const getPerformanceDraft = (itemId: string, prescribedSets: number): ActualExercisePerformance => (
    drafts[itemId]
    ?? execution?.performances[itemId]
    ?? {
      routineItemId: itemId,
      sets: Array.from({ length: prescribedSets }, (_, index) => ({
        setNumber: index + 1,
        completed: false,
        actualRepetitions: null,
        actualLoad: null,
        loadUnit: null,
      })),
      rir: null,
      rpePercent: null,
    }
  );

  const updatePerformance = (itemId: string, update: (performance: ActualExercisePerformance) => ActualExercisePerformance, prescribedSets: number) => {
    setDrafts((current) => ({
      ...current,
      [itemId]: update(current[itemId] ?? getPerformanceDraft(itemId, prescribedSets)),
    }));
    setActionError(null);
  };

  const saveItemPerformance = async (item: NonNullable<typeof selectedDay>['items'][number]) => {
    if (!assignment || !selectedDay || !executionEditable || cycleSlotAttemptsExhausted || assignment.status !== 'PUBLISHED') return;
    const performance = getPerformanceDraft(item.id, item.prescribedSets);
    try {
      validateActualExercisePerformance(
        performance,
        item.prescribedSets,
        item.baseLoad !== null || item.targetLoad.trim() !== ''
      );
      setSavingItemId(item.id);
      setActionError(null);
      setNotice(null);
      const saved = await saveRoutinePerformance(
        assignment.id,
        selectedDay.position,
        performance
      );
      setNotice(`Registro guardado · ${Math.round(saved.progressPercent)}% de la rutina`);
      setDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo guardar la ejecución.');
    } finally {
      setSavingItemId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Header title="Mis Rutinas" subtitle="Programación asignada por tu coach" />

      <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Fecha
        <DateField ariaLabel="Fecha de rutina" onChange={setSelectedDate} value={selectedDate} />
      </label>

      {state.status === 'loading' && (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500" role="status">
          <LoaderCircle className="animate-spin" size={17} /> Cargando tu rutina…
        </p>
      )}

      {state.status === 'error' && (
        <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-4" role="alert">
          <p className="text-sm text-rose-300">{state.message}</p>
          <button className="mt-2 text-xs font-semibold text-rose-200 underline underline-offset-2" onClick={reload} type="button">Reintentar</button>
        </div>
      )}

      {state.status === 'loaded' && !assignment && (
        <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center">
          <CalendarDays className="mx-auto mb-3 text-zinc-600" size={25} />
          <p className="text-sm font-semibold text-zinc-300">Aún no tienes programación para esta fecha</p>
          <p className="mt-1 text-xs text-zinc-500">Tu coach puede asignarte una rutina para {formatLocalDate(selectedDate)}.</p>
        </div>
      )}

      {state.status === 'loaded' && assignment && (
        <>
          {assignments.length > 1 && !hasSingleDay && (
            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Programas disponibles</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {assignments.map((program) => (
                  <button
                    aria-pressed={assignment.id === program.id}
                    className={`min-h-10 shrink-0 rounded-lg border px-3 text-xs font-semibold ${assignment.id === program.id ? 'border-brand-600 bg-brand-950/40 text-brand-300' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}
                    key={program.id}
                    onClick={() => {
                      setSelectedAssignmentId(program.id);
                      setSelectedDayPosition(1);
                    }}
                    type="button"
                  >
                    {program.title}
                  </button>
                ))}
              </div>
            </section>
          )}

          {assignment.programMode === 'CYCLE' && (
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Día del ciclo">
              {assignment.days.map((day) => (
                <button
                  aria-selected={selectedDayPosition === day.position}
                  className={`min-h-10 shrink-0 rounded-lg border px-3 text-xs font-semibold ${selectedDayPosition === day.position ? 'border-brand-600 bg-brand-950/40 text-brand-300' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}
                  key={day.id}
                  onClick={() => setSelectedDayPosition(day.position)}
                  role="tab"
                  type="button"
                >
                  {day.position}. {day.title}
                </button>
              ))}
            </div>
          )}

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-900/50 bg-brand-950/30 text-brand-300">
                <CalendarDays size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">Programación publicada</p>
                <h2 className="mt-1 font-display text-base font-bold text-white">{assignment.title}</h2>
                <p className="mt-1 text-xs text-zinc-500">{assignment.programMode === 'SINGLE_DAY' && assignment.scheduledFor ? formatLocalDate(assignment.scheduledFor) : `${selectedDay?.title ?? 'Día de ciclo'} · ${formatLocalDate(selectedDate)}`}</p>
              </div>
            </div>
          </section>

          {execution && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {execution.status === 'COMPLETED' ? 'Rutina completada' : execution.status === 'CLOSED_INCOMPLETE' ? 'Ejecución cerrada' : 'Progreso de hoy'}
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">{Math.round(execution.progressPercent)}%</p>
                </div>
                <span className="text-xs text-zinc-400">{execution.completedSets} / {execution.prescribedSets} series</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${execution.progressPercent}%` }} />
              </div>
              {execution.status !== 'IN_PROGRESS' && <p className="mt-2 text-[11px] text-zinc-500">Esta rutina se conserva como solo lectura.</p>}
            </section>
          )}

          {selectedDay?.items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 p-5 text-center text-sm text-zinc-500">Esta rutina aún no tiene ejercicios.</p>
          ) : (
            <section className="space-y-2.5">
              <div className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <Dumbbell size={13} /> {selectedDay?.items.length ?? 0} ejercicios
              </div>
              {selectedDay?.items.map((item, index) => {
                const performance = getPerformanceDraft(item.id, item.prescribedSets);
                const completedSetCount = getCompletedSetCount(performance);
                const progressionTarget = assignment.programMode === 'CYCLE' && item.baseRepetitions !== null
                  ? calculateCycleExerciseTarget({
                    exerciseItemId: item.id,
                    baseRepetitions: item.baseRepetitions,
                    repetitionsIncrement: item.repetitionsIncrement,
                    baseLoad: item.baseLoad,
                    loadIncrement: item.loadIncrement,
                    loadUnit: item.loadUnit,
                  }, slotHistory?.completedRuns ?? 0)
                  : null;
                return (
                <article key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white">{index + 1}. {item.exercise.name}</h3>
                      <p className="mt-1 text-[11px] text-zinc-400">{item.exercise.primaryMuscles.map(formatMuscleName).join(', ')}</p>
                      <p className="mt-1.5 text-xs font-medium text-brand-300">
                        {item.prescribedSets} × {progressionTarget?.repetitions ?? item.prescribedReps}
                        {progressionTarget
                          ? progressionTarget.load === null ? ' · Sin carga' : ` · ${progressionTarget.load} ${progressionTarget.loadUnit}`
                          : item.targetLoad ? ` · ${item.targetLoad}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-1 text-[9px] text-zinc-500">
                      {exerciseFocusLabels[item.exercise.focus]}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.exercise.equipment.map((equipment) => (
                      <span key={equipment} className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[9px] text-zinc-500">
                        {exerciseEquipmentLabels[equipment]}
                      </span>
                    ))}
                    <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[9px] text-zinc-500">
                      {exerciseMovementLabels[item.exercise.movementPattern]}
                    </span>
                  </div>

                  <details className="mt-3 border-t border-zinc-800 pt-2.5">
                    <summary className="cursor-pointer text-[11px] font-medium text-brand-400">Instrucciones y técnica</summary>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{item.exercise.instructions}</p>
                    {item.exercise.tips && <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-amber-200/70">{item.exercise.tips}</p>}
                    <p className="mt-2 text-[10px] text-zinc-500">Descanso: {item.rest}{item.workDuration ? ` · Trabajo: ${item.workDuration}` : ''}</p>
                    <ExerciseVideoPreview className="mt-3" title={item.exercise.name} videoUrl={item.exercise.videoUrl} />
                  </details>

                  <div className="mt-4 space-y-3 border-t border-zinc-800 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Registro real</h4>
                      <span className="text-[10px] text-zinc-500">{completedSetCount} / {item.prescribedSets} series completas</span>
                    </div>
                    {performance.sets.map((set, setIndex) => (
                      <div className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2" key={set.setNumber}>
                        <label className="flex min-h-10 items-center gap-1.5 text-[10px] text-zinc-400">
                          <input
                            checked={set.completed}
                            className="h-4 w-4 accent-emerald-500"
                            disabled={!executionEditable || savingItemId === item.id}
                            onChange={(event) => updatePerformance(item.id, (current) => ({
                              ...current,
                              sets: current.sets.map((entry, entryIndex) => entryIndex === setIndex ? { ...entry, completed: event.target.checked } : entry),
                            }), item.prescribedSets)}
                            type="checkbox"
                          />
                          Serie {set.setNumber}
                        </label>
                        <label className="text-[9px] text-zinc-500">Reps<input aria-label={`Repeticiones reales, ${item.exercise.name}, serie ${set.setNumber}`} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-xs text-white" disabled={!executionEditable || savingItemId === item.id} min="0" step="1" type="number" value={set.actualRepetitions ?? ''} onChange={(event) => updatePerformance(item.id, (current) => ({
                          ...current,
                          sets: current.sets.map((entry, entryIndex) => entryIndex === setIndex ? { ...entry, actualRepetitions: event.target.value === '' ? null : Number(event.target.value) } : entry),
                        }), item.prescribedSets)} /></label>
                        <label className="text-[9px] text-zinc-500">Carga<input aria-label={`Carga real, ${item.exercise.name}, serie ${set.setNumber}`} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-xs text-white" disabled={!executionEditable || savingItemId === item.id} min="0" step="1" type="number" value={set.actualLoad ?? ''} onChange={(event) => updatePerformance(item.id, (current) => ({
                          ...current,
                          sets: current.sets.map((entry, entryIndex) => entryIndex === setIndex ? { ...entry, actualLoad: event.target.value === '' ? null : Number(event.target.value), loadUnit: event.target.value === '' ? null : (entry.loadUnit ?? item.loadUnit ?? 'kg') } : entry),
                        }), item.prescribedSets)} /></label>
                        <select aria-label={`Unidad de carga, ${item.exercise.name}, serie ${set.setNumber}`} className="min-h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300" disabled={!executionEditable || savingItemId === item.id || set.actualLoad === null} value={set.loadUnit ?? item.loadUnit ?? 'kg'} onChange={(event) => updatePerformance(item.id, (current) => ({
                          ...current,
                          sets: current.sets.map((entry, entryIndex) => entryIndex === setIndex ? { ...entry, loadUnit: event.target.value as 'lbs' | 'kg' } : entry),
                        }), item.prescribedSets)}><option value="kg">kg</option><option value="lbs">lbs</option></select>
                      </div>
                    ))}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block text-[10px] text-zinc-400">
                        <span className="flex justify-between"><span>RIR</span><span>{performance.rir ?? 'Sin registrar'} · 1-10</span></span>
                        <input aria-label={`RIR de ${item.exercise.name}`} className="mt-2 w-full accent-brand-500" disabled={!executionEditable || savingItemId === item.id} max="10" min="1" onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, rir: Number(event.target.value) }), item.prescribedSets)} type="range" value={performance.rir ?? 1} />
                      </label>
                      <label className="block text-[10px] text-zinc-400">
                        <span className="flex justify-between"><span>RPE</span><span>{performance.rpePercent ?? 'Sin registrar'}% · 0-100%</span></span>
                        <input aria-label={`RPE de ${item.exercise.name}`} className="mt-2 w-full accent-brand-500" disabled={!executionEditable || savingItemId === item.id} max="100" min="0" onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, rpePercent: Number(event.target.value) }), item.prescribedSets)} type="range" value={performance.rpePercent ?? 0} />
                      </label>
                    </div>

                    {executionEditable && (
                      <button className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-xs font-bold text-white hover:bg-brand-500 disabled:opacity-50" disabled={savingItemId === item.id || completedSetCount === 0 || cycleSlotAttemptsExhausted} onClick={() => void saveItemPerformance(item)} type="button">
                        {savingItemId === item.id ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />}
                        Guardar ejecución real
                      </button>
                    )}
                  </div>
                </article>
                );
              })}
            </section>
          )}
          {actionError && <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{actionError}</p>}
          {notice && <p className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs text-emerald-300" role="status">{notice}</p>}
          {!executionEditable && <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-500">La ejecución solo se puede registrar o retomar en su fecha UTC de inicio.</p>}
          {cycleSlotAttemptsExhausted && <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-500">Este día del ciclo ya agotó sus intentos configurados.</p>}
        </>
      )}
    </div>
  );
}
