import { useState } from 'react';
import { ArrowLeft, LoaderCircle, Save } from 'lucide-react';
import { useStudentRoutineAssignment } from '@/app/useStudentRoutineAssignment';
import TenantLoadingIndicator from '@/components/TenantLoadingIndicator';
import ExerciseVideoPreview from '@/components/ExerciseVideoPreview';
import { exerciseEquipmentLabels, exerciseFocusLabels, exerciseMovementLabels } from '@/domain/exerciseDefinition';
import { formatLocalDate, utcDateInputValue } from '@/domain/localDate';
import {
  calculateCycleExerciseTarget,
  getCurrentCycleIteration,
  getNextCycleSlotAttempt,
  isCycleSlotAvailable,
} from '@/domain/trainingCycle';
import { createEmptyExercisePerformance, validateActualExercisePerformance } from '@/domain/workoutExecution';
import type { ActualExercisePerformance } from '@/domain/workoutExecution';
import type { Profile } from '@/domain/profile';
import type { StudentRoutineTarget } from '@/types';

interface StudentTrainingScreenProps {
  profile: Profile;
  target: StudentRoutineTarget;
  onBack: () => void;
}

export default function StudentTrainingScreen({ profile, target, onBack }: StudentTrainingScreenProps) {
  const [drafts, setDrafts] = useState<Record<string, ActualExercisePerformance>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tenantId = profile.tenant_id ?? '';
  const { state, savePerformance } = useStudentRoutineAssignment(profile.id, tenantId, target.executionDate);
  const assignment = state.assignments.find(({ id }) => id === target.assignmentId) ?? null;
  const day = assignment?.days.find(({ position }) => position === target.cycleDayPosition) ?? null;
  const execution = state.execution
    && state.execution.assignmentId === assignment?.id
    && state.execution.cycleDayId === day?.id
    ? state.execution
    : null;
  const isCurrentDate = target.executionDate === utcDateInputValue();
  const dailyExecutionTaken = Boolean(state.execution && !execution);
  const editable = execution
    ? true
    : isCurrentDate && !dailyExecutionTaken;
  const history = day ? state.cycleSlotHistory[day.id] : undefined;
  const cycleIteration = assignment?.programMode === 'CYCLE'
    ? getCurrentCycleIteration(assignment.days.map(
      (cycleDay) => state.cycleSlotHistory[cycleDay.id]?.terminalAttemptCount ?? 0
    ))
    : null;
  const cycleSlotAvailable = assignment?.programMode !== 'CYCLE' || !day || !cycleIteration
    ? true
    : isCycleSlotAvailable(
      assignment.additionalCycleRepeats,
      history?.attemptCount ?? 0,
      history?.terminalAttemptCount ?? 0,
      cycleIteration
    );
  const attemptsExhausted = Boolean(
    assignment?.programMode === 'CYCLE'
    && !execution
    && getNextCycleSlotAttempt(assignment.additionalCycleRepeats, history?.attemptCount ?? 0) === null
  );
  const canRegister = editable && (Boolean(execution) || (!attemptsExhausted && cycleSlotAvailable));

  const getPerformance = (itemId: string): ActualExercisePerformance => (
    drafts[itemId]
    ?? execution?.performances[itemId]
    ?? createEmptyExercisePerformance(itemId, day?.items.find(({ id }) => id === itemId)?.prescribedSets ?? 1)
  );

  const updatePerformance = (
    itemId: string,
    update: (performance: ActualExercisePerformance) => ActualExercisePerformance
  ) => {
    setDrafts((current) => ({
      ...current,
      [itemId]: update(current[itemId] ?? getPerformance(itemId)),
    }));
    setActionError(null);
  };

  const updateSet = (
    itemId: string,
    setNumber: number,
    update: (set: ActualExercisePerformance['sets'][number]) => ActualExercisePerformance['sets'][number]
  ) => updatePerformance(itemId, (current) => ({
    ...current,
    sets: current.sets.map((set) => set.setNumber === setNumber ? update(set) : set),
  }));

  const registerExercise = async (item: NonNullable<typeof day>['items'][number]) => {
    if (!assignment || !day || !canRegister || assignment.status !== 'PUBLISHED') return;
    const performance = getPerformance(item.id);
    try {
      validateActualExercisePerformance(performance, item.baseLoad !== null || item.targetLoad.trim() !== '');
      if (!performance.sets.some(({ completed }) => completed)) {
        throw new Error('Marca al menos una serie realizada antes de guardar.');
      }
      setSavingItemId(item.id);
      setActionError(null);
      setNotice(null);
      const saved = await savePerformance(assignment.id, day.position, performance, execution?.id ?? null);
      setDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setNotice(saved.status === 'COMPLETED'
        ? 'Entrenamiento completado. Tus resultados quedaron registrados.'
        : execution?.status === 'COMPLETED' || execution?.status === 'CLOSED_INCOMPLETE'
          ? 'Corrección guardada. El estado final del entrenamiento se conserva.'
          : 'Series guardadas. Puedes continuar con el siguiente ejercicio.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo registrar el ejercicio.');
    } finally {
      setSavingItemId(null);
    }
  };

  if (state.status === 'loading' && !assignment) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-sm text-zinc-400" role="status">
        <TenantLoadingIndicator className="mr-2" size={17} /> Cargando entrenamiento…
      </div>
    );
  }

  if (state.status === 'error' || !assignment || !day) {
    return (
      <div className="space-y-4">
        <button className="flex min-h-11 items-center gap-2 text-sm font-semibold text-zinc-300" onClick={onBack} type="button">
          <ArrowLeft aria-hidden="true" size={17} /> Entrenar
        </button>
        <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-4 text-sm text-rose-300" role="alert">
          {state.status === 'error' ? state.message : 'Este entrenamiento ya no está disponible.'}
        </p>
      </div>
    );
  }

  const readOnlyMessage = execution?.status === 'COMPLETED'
    ? 'Terminaste este entrenamiento. Puedes revisar y corregir tus resultados.'
    : execution?.status === 'CLOSED_INCOMPLETE'
      ? 'Este entrenamiento quedó incompleto. Puedes revisar y corregir lo registrado sin cambiar su estado final.'
      : !isCurrentDate
        ? 'Puedes consultar este entrenamiento y tus resultados.'
        : dailyExecutionTaken
          ? 'Ya registraste otro entrenamiento hoy. Este estará disponible otro día.'
          : attemptsExhausted
            ? 'Ya completaste las veces disponibles para este día del ciclo.'
            : !cycleSlotAvailable
              ? 'Este entrenamiento estará disponible cuando termines los demás de este ciclo.'
            : null;

  return (
    <div className="space-y-4 pb-2">
      <button
        aria-label="Volver a entrenar"
        className="flex min-h-11 items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft aria-hidden="true" size={18} /> Entrenar
      </button>

      <header className="space-y-1 border-b border-zinc-800 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">
          {assignment.programMode === 'CYCLE' ? `${day.title} · ${assignment.title}` : 'Entrenamiento asignado'}
        </p>
        <h1 className="font-display text-xl font-bold text-white">
          {assignment.programMode === 'CYCLE' ? day.title : assignment.title}
        </h1>
        <time className="text-xs text-zinc-400" dateTime={target.executionDate}>{formatLocalDate(target.executionDate)}</time>
      </header>

      {execution && (
        <section aria-live="polite" className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                {execution.status === 'COMPLETED' ? 'Entrenamiento completado' : execution.status === 'CLOSED_INCOMPLETE' ? 'Entrenamiento finalizado' : 'Tu avance'}
              </p>
              <p className="mt-1 text-lg font-bold text-white">{Math.round(execution.progressPercent)}%</p>
            </div>
            <span className="text-xs text-zinc-400">
              {execution.progressUnit === 'sets'
                ? `${execution.completedSets} de ${execution.prescribedSets} series`
                : `${execution.completedExercises} de ${execution.prescribedExercises} ejercicios`}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${execution.progressPercent}%` }} />
          </div>
        </section>
      )}

      {readOnlyMessage && <p className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">{readOnlyMessage}</p>}

      <section aria-label="Ejercicios del entrenamiento" className="space-y-3">
        {day.items.map((item) => {
          const performance = getPerformance(item.id);
          const completedSetCount = performance.sets.filter(({ completed }) => completed).length;
          const itemCompleted = performance.sets.length
            ? completedSetCount === item.prescribedSets
            : Boolean(performance.legacyRecord?.completed);
          const completedRunsBeforeExecution = Math.max(
            0,
            (history?.completedRuns ?? 0) - (execution?.status === 'COMPLETED' ? 1 : 0)
          );
          const progressionTarget = assignment.programMode === 'CYCLE' && item.baseRepetitions !== null
            ? calculateCycleExerciseTarget({
              exerciseItemId: item.id,
              baseRepetitions: item.baseRepetitions,
              repetitionsIncrement: item.repetitionsIncrement,
              baseLoad: item.baseLoad,
              loadIncrement: item.loadIncrement,
              loadUnit: item.loadUnit,
            }, completedRunsBeforeExecution)
            : null;
          const requiresLoad = item.baseLoad !== null || item.targetLoad.trim() !== '';
          return (
            <details className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900" key={item.id}>
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
                <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${itemCompleted ? 'bg-brand-900 text-brand-100' : 'bg-zinc-800 text-zinc-300'}`}>
                  {completedSetCount}/{item.prescribedSets}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">{item.exercise.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-zinc-400">
                    Programado: {item.prescribedSets} × {progressionTarget?.repetitions ?? item.prescribedReps}
                    {progressionTarget
                      ? progressionTarget.load === null ? ' · Sin carga' : ` · ${progressionTarget.load} ${progressionTarget.loadUnit}`
                      : item.targetLoad ? ` · ${item.targetLoad}` : ''}
                  </span>
                </span>
                {itemCompleted && <span className="shrink-0 text-[10px] font-semibold text-brand-200">Completo</span>}
              </summary>

              <div className="space-y-4 border-t border-zinc-800 px-4 py-4">
                <div className="flex flex-wrap gap-1.5 text-[10px] text-zinc-400">
                  {item.exercise.equipment.map((equipment) => (
                    <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1" key={equipment}>{exerciseEquipmentLabels[equipment]}</span>
                  ))}
                  <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
                    {exerciseFocusLabels[item.exercise.focus]} · {exerciseMovementLabels[item.exercise.movementPattern]}
                  </span>
                </div>

                <details className="border-b border-zinc-800 pb-2">
                  <summary className="min-h-10 cursor-pointer py-2 text-xs font-semibold text-brand-300">Ver explicación y video</summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{item.exercise.instructions}</p>
                  {item.exercise.tips && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{item.exercise.tips}</p>}
                  {item.coachInstructions && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{item.coachInstructions}</p>}
                  <p className="mt-2 text-xs text-zinc-400">Descanso: {item.rest}</p>
                  <ExerciseVideoPreview className="mt-3" title={item.exercise.name} videoUrl={item.exercise.videoUrl} />
                </details>

                {performance.legacyRecord && performance.sets.every(({ completed }) => !completed) && (
                  <p className="rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-300">
                    Registro anterior: {performance.legacyRecord.actualRepetitions ?? '—'} rep.
                    {performance.legacyRecord.actualLoad !== null ? ` · ${performance.legacyRecord.actualLoad} ${performance.legacyRecord.loadUnit}` : ''}
                    {performance.legacyRecord.rir !== null ? ` · RIR ${performance.legacyRecord.rir}` : ''}
                    {performance.legacyRecord.rpePercent !== null ? ` · RPE ${performance.legacyRecord.rpePercent}%` : ''}
                  </p>
                )}
                {performance.legacyRecord && performance.sets.some(({ completed }) => completed)
                  && (performance.legacyRecord.rir !== null || performance.legacyRecord.rpePercent !== null) && (
                    <p className="rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-300">
                      Esfuerzo guardado originalmente por ejercicio:
                      {performance.legacyRecord.rir !== null ? ` RIR ${performance.legacyRecord.rir}` : ''}
                      {performance.legacyRecord.rpePercent !== null ? ` · RPE ${performance.legacyRecord.rpePercent}%` : ''}
                    </p>
                  )}

                <div className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">Resultado por serie</h3>
                    <span className="text-[10px] text-zinc-400">{requiresLoad ? 'Carga obligatoria' : 'Carga opcional'}</span>
                  </div>
                  {performance.sets.map((set) => {
                    const terminalSetLocked = execution !== null
                      && execution.status !== 'IN_PROGRESS'
                      && set.completed;
                    const controlsDisabled = !canRegister || savingItemId === item.id;
                    return (
                      <fieldset className="rounded-lg border border-zinc-800 bg-zinc-950 p-3" key={set.setNumber}>
                        <legend className="px-1 text-xs font-bold text-zinc-200">Serie {set.setNumber}</legend>
                        <div className="grid grid-cols-[auto_minmax(4rem,0.7fr)_minmax(0,1.3fr)] items-end gap-2">
                          <label className="flex min-h-11 items-center gap-2 pr-1 text-[11px] text-zinc-300">
                            <input
                              aria-label={`Serie ${set.setNumber} realizada: ${item.exercise.name}`}
                              checked={set.completed}
                              className="h-5 w-5 accent-brand-500"
                              disabled={controlsDisabled || terminalSetLocked}
                              onChange={(event) => updateSet(item.id, set.setNumber, (current) => ({ ...current, completed: event.target.checked }))}
                              type="checkbox"
                            />
                            Hecha
                          </label>
                          <label className="text-[10px] font-medium text-zinc-400">
                            Rep.
                            <input
                              aria-label={`Repeticiones de la serie ${set.setNumber}: ${item.exercise.name}`}
                              className="mt-1 min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-sm text-white"
                              disabled={controlsDisabled}
                              min="0"
                              step="1"
                              type="number"
                              value={set.actualRepetitions ?? ''}
                              onChange={(event) => updateSet(item.id, set.setNumber, (current) => ({ ...current, actualRepetitions: event.target.value === '' ? null : Number(event.target.value) }))}
                            />
                          </label>
                          <label className="text-[10px] font-medium text-zinc-400">
                            Carga
                            <span className="mt-1 flex gap-1">
                              <input
                                aria-label={`Carga de la serie ${set.setNumber}: ${item.exercise.name}`}
                                className="min-h-11 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-sm text-white"
                                disabled={controlsDisabled}
                                min="0"
                                step="1"
                                type="number"
                                value={set.actualLoad ?? ''}
                                onChange={(event) => updateSet(item.id, set.setNumber, (current) => ({
                                  ...current,
                                  actualLoad: event.target.value === '' ? null : Number(event.target.value),
                                  loadUnit: event.target.value === '' ? null : (current.loadUnit ?? item.loadUnit ?? 'kg'),
                                }))}
                              />
                              <select
                                aria-label={`Unidad de carga de la serie ${set.setNumber}: ${item.exercise.name}`}
                                className="min-h-11 rounded-md border border-zinc-700 bg-zinc-900 px-1.5 text-xs text-zinc-200"
                                disabled={controlsDisabled || set.actualLoad === null}
                                value={set.loadUnit ?? item.loadUnit ?? 'kg'}
                                onChange={(event) => updateSet(item.id, set.setNumber, (current) => ({ ...current, loadUnit: event.target.value as 'kg' | 'lbs' }))}
                              >
                                <option value="kg">kg</option><option value="lbs">lbs</option>
                              </select>
                            </span>
                          </label>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <label className="text-[11px] text-zinc-300">
                            <span className="flex justify-between gap-2"><span>RIR</span><span>{set.rir ?? '—'}</span></span>
                            <input
                              aria-label={`RIR serie ${set.setNumber}: ${item.exercise.name}`}
                              className="mt-1 min-h-8 w-full accent-brand-500"
                              disabled={controlsDisabled}
                              max="10"
                              min="1"
                              onChange={(event) => updateSet(item.id, set.setNumber, (current) => ({ ...current, rir: Number(event.target.value) }))}
                              type="range"
                              value={set.rir ?? 1}
                            />
                          </label>
                          <label className="text-[11px] text-zinc-300">
                            <span className="flex justify-between gap-2"><span>RPE</span><span>{set.rpePercent === null ? '—' : `${set.rpePercent}%`}</span></span>
                            <input
                              aria-label={`RPE serie ${set.setNumber}: ${item.exercise.name}`}
                              className="mt-1 min-h-8 w-full accent-brand-500"
                              disabled={controlsDisabled}
                              max="100"
                              min="0"
                              onChange={(event) => updateSet(item.id, set.setNumber, (current) => ({ ...current, rpePercent: Number(event.target.value) }))}
                              step="5"
                              type="range"
                              value={set.rpePercent ?? 0}
                            />
                          </label>
                        </div>
                      </fieldset>
                    );
                  })}
                  {canRegister && performance.sets.some(({ completed }) => completed) && (
                    <button
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-bold text-white hover:bg-brand-action-hover disabled:cursor-wait disabled:opacity-50"
                      disabled={savingItemId === item.id}
                      onClick={() => void registerExercise(item)}
                      type="button"
                    >
                      {savingItemId === item.id ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : <Save aria-hidden="true" size={17} />}
                      {savingItemId === item.id ? 'Guardando…' : execution?.status === 'COMPLETED' || execution?.status === 'CLOSED_INCOMPLETE' || itemCompleted ? 'Guardar corrección' : 'Guardar series'}
                    </button>
                  )}
                </div>
              </div>
            </details>
          );
        })}
      </section>

      {actionError && <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-sm text-rose-200" role="alert">{actionError}</p>}
      {notice && <p className="rounded-xl border border-brand-800 bg-brand-950 p-3 text-sm text-brand-100" role="status">{notice}</p>}
    </div>
  );
}
