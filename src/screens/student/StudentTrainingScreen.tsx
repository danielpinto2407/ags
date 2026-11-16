import { useState } from 'react';
import { ArrowLeft, LoaderCircle, Save } from 'lucide-react';
import { useStudentRoutineAssignment } from '@/app/useStudentRoutineAssignment';
import ExerciseVideoPreview from '@/components/ExerciseVideoPreview';
import { exerciseEquipmentLabels, exerciseFocusLabels, exerciseMovementLabels, formatMuscleName } from '@/domain/exerciseDefinition';
import { formatLocalDate, utcDateInputValue } from '@/domain/localDate';
import {
  calculateCycleExerciseTarget,
  getCurrentCycleIteration,
  getNextCycleSlotAttempt,
  isCycleSlotAvailable,
} from '@/domain/trainingCycle';
import { validateActualExercisePerformance } from '@/domain/workoutExecution';
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
  const editable = isCurrentDate && !dailyExecutionTaken && (!execution || execution.status === 'IN_PROGRESS');
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
  const canRegister = editable && !attemptsExhausted && (Boolean(execution) || cycleSlotAvailable);

  const getPerformance = (itemId: string): ActualExercisePerformance => (
    drafts[itemId]
    ?? execution?.performances[itemId]
    ?? {
      routineItemId: itemId,
      completed: false,
      actualRepetitions: null,
      actualLoad: null,
      loadUnit: null,
      rir: null,
      rpePercent: null,
    }
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

  const registerExercise = async (item: NonNullable<typeof day>['items'][number]) => {
    if (!assignment || !day || !canRegister || assignment.status !== 'PUBLISHED') return;
    const performance = { ...getPerformance(item.id), completed: true };
    try {
      validateActualExercisePerformance(performance, item.baseLoad !== null || item.targetLoad.trim() !== '');
      if (performance.rir === null || performance.rpePercent === null) {
        throw new Error('Selecciona tu esfuerzo percibido para registrar el ejercicio.');
      }
      setSavingItemId(item.id);
      setActionError(null);
      setNotice(null);
      const saved = await savePerformance(assignment.id, day.position, performance);
      setDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setNotice(saved.status === 'COMPLETED'
        ? 'Entrenamiento completado. Tus resultados quedaron registrados.'
        : 'Ejercicio registrado. Puedes continuar con el siguiente.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo registrar el ejercicio.');
    } finally {
      setSavingItemId(null);
    }
  };

  if (state.status === 'loading' && !assignment) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-sm text-zinc-400" role="status">
        <LoaderCircle aria-hidden="true" className="mr-2 animate-spin" size={17} /> Cargando entrenamiento…
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
    ? 'Terminaste este entrenamiento. Aquí puedes revisar lo que registraste.'
    : execution?.status === 'CLOSED_INCOMPLETE'
      ? 'Este entrenamiento quedó incompleto. Puedes revisar tu avance y volver cuando esté disponible.'
      : !isCurrentDate
        ? 'Puedes consultar este entrenamiento y tus resultados.'
        : dailyExecutionTaken
          ? 'Ya registraste otro entrenamiento hoy. Este estará disponible otro día.'
          : attemptsExhausted
            ? 'Ya completaste las veces disponibles para este día del ciclo.'
            : !cycleSlotAvailable
              ? 'Este entrenamiento estará disponible cuando termines los demás de esta vuelta.'
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
            <span className="text-xs text-zinc-400">{execution.completedExercises} de {execution.prescribedExercises} ejercicios</span>
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
          const itemCompleted = execution?.performances[item.id]?.completed ?? false;
          const progressionTarget = assignment.programMode === 'CYCLE' && item.baseRepetitions !== null
            ? calculateCycleExerciseTarget({
              exerciseItemId: item.id,
              baseRepetitions: item.baseRepetitions,
              repetitionsIncrement: item.repetitionsIncrement,
              baseLoad: item.baseLoad,
              loadIncrement: item.loadIncrement,
              loadUnit: item.loadUnit,
            }, history?.completedRuns ?? 0)
            : null;
          const requiresLoad = item.baseLoad !== null || item.targetLoad.trim() !== '';
          const readyToRegister = performance.actualRepetitions !== null
            && (!requiresLoad || performance.actualLoad !== null)
            && performance.rir !== null
            && performance.rpePercent !== null;

          return (
            <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="mt-1 text-lg font-bold text-white">{item.exercise.name}</h2>
                  <p className="mt-1 text-xs text-zinc-400">{item.exercise.primaryMuscles.map(formatMuscleName).join(', ')}</p>
                  <p className="mt-2 text-sm font-semibold text-brand-200">
                    {item.prescribedSets} × {progressionTarget?.repetitions ?? item.prescribedReps}
                    {progressionTarget
                      ? progressionTarget.load === null ? ' · Sin carga' : ` · ${progressionTarget.load} ${progressionTarget.loadUnit}`
                      : item.targetLoad ? ` · ${item.targetLoad}` : ''}
                  </p>
                </div>
                {itemCompleted && <span className="shrink-0 rounded-full border border-brand-800 bg-brand-950 px-2.5 py-1 text-[10px] font-semibold text-brand-100">Registrado</span>}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.exercise.equipment.map((equipment) => (
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-400" key={equipment}>
                    {exerciseEquipmentLabels[equipment]}
                  </span>
                ))}
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-400">
                  {exerciseFocusLabels[item.exercise.focus]} · {exerciseMovementLabels[item.exercise.movementPattern]}
                </span>
              </div>

              <details className="mt-3 border-t border-zinc-800 pt-2">
                <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-brand-300">Ver explicación y video</summary>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{item.exercise.instructions}</p>
                {item.exercise.tips && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{item.exercise.tips}</p>}
                {item.coachInstructions && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{item.coachInstructions}</p>}
                <p className="mt-2 text-xs text-zinc-400">Descanso: {item.rest}</p>
                <ExerciseVideoPreview className="mt-3" title={item.exercise.name} videoUrl={item.exercise.videoUrl} />
              </details>

              <div className="mt-4 space-y-4 border-t border-zinc-800 pt-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Lo que hiciste</h3>
                  <p className="mt-1 text-xs text-zinc-400">Registra tus repeticiones, carga si aplica y esfuerzo.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-medium text-zinc-300">
                    Repeticiones
                    <input aria-label={`Repeticiones realizadas en ${item.exercise.name}`} className="mt-1 min-h-12 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-base text-white" disabled={!canRegister || savingItemId === item.id} min="0" step="1" type="number" value={performance.actualRepetitions ?? ''} onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, actualRepetitions: event.target.value === '' ? null : Number(event.target.value) }))} />
                  </label>
                  <label className="text-xs font-medium text-zinc-300">
                    Carga {requiresLoad ? '' : '(opcional)'}
                    <div className="mt-1 flex gap-2">
                      <input aria-label={`Carga utilizada en ${item.exercise.name}`} className="min-h-12 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-base text-white" disabled={!canRegister || savingItemId === item.id} min="0" step="1" type="number" value={performance.actualLoad ?? ''} onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, actualLoad: event.target.value === '' ? null : Number(event.target.value), loadUnit: event.target.value === '' ? null : (current.loadUnit ?? item.loadUnit ?? 'kg') }))} />
                      <select aria-label={`Unidad de carga de ${item.exercise.name}`} className="min-h-12 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-200" disabled={!canRegister || savingItemId === item.id || performance.actualLoad === null} value={performance.loadUnit ?? item.loadUnit ?? 'kg'} onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, loadUnit: event.target.value as 'lbs' | 'kg' }))}>
                        <option value="kg">kg</option><option value="lbs">lbs</option>
                      </select>
                    </div>
                  </label>
                </div>

                <label className="block text-sm text-zinc-300">
                  <span className="flex justify-between gap-2"><span>RIR</span><span>{performance.rir ?? 'Selecciona'}</span></span>
                  <input aria-label={`RIR para ${item.exercise.name}`} className="mt-3 min-h-8 w-full accent-brand-500" disabled={!canRegister || savingItemId === item.id} max="10" min="1" onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, rir: Number(event.target.value) }))} type="range" value={performance.rir ?? 1} />
                </label>
                <label className="block text-sm text-zinc-300">
                  <span className="flex justify-between gap-2"><span>RPE</span><span>{performance.rpePercent === null ? 'Selecciona' : `${performance.rpePercent}%`}</span></span>
                  <input aria-label={`RPE para ${item.exercise.name}`} className="mt-3 min-h-8 w-full accent-brand-500" disabled={!canRegister || savingItemId === item.id} max="100" min="0" onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, rpePercent: Number(event.target.value) }))} type="range" value={performance.rpePercent ?? 0} />
                </label>

                {canRegister && (
                  <button
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-500 disabled:cursor-wait disabled:opacity-50"
                    disabled={!readyToRegister || savingItemId === item.id}
                    onClick={() => void registerExercise(item)}
                    type="button"
                  >
                    {savingItemId === item.id ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : <Save aria-hidden="true" size={17} />}
                    {savingItemId === item.id ? 'Registrando…' : itemCompleted ? 'Actualizar registro' : 'Registrar ejercicio'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {actionError && <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-sm text-rose-200" role="alert">{actionError}</p>}
      {notice && <p className="rounded-xl border border-brand-800 bg-brand-950 p-3 text-sm text-brand-100" role="status">{notice}</p>}
    </div>
  );
}
