import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Dumbbell, LoaderCircle, Play, Save } from 'lucide-react';
import Header from '@/components/Header';
import ExerciseVideoPreview from '@/components/ExerciseVideoPreview';
import { useStudentRoutineAssignment } from '@/app/useStudentRoutineAssignment';
import type { Profile } from '@/domain/profile';
import { exerciseEquipmentLabels, exerciseFocusLabels, exerciseMovementLabels, formatMuscleName } from '@/domain/exerciseDefinition';
import { formatLocalDate, shiftUtcDate, utcDateInputValue, utcWeekInputValues } from '@/domain/localDate';
import { validateActualExercisePerformance } from '@/domain/workoutExecution';
import type { ActualExercisePerformance } from '@/domain/workoutExecution';
import { calculateCycleExerciseTarget } from '@/domain/trainingCycle';

interface StudentRoutinesProps {
  profile: Profile;
}

export default function StudentRoutines({ profile }: StudentRoutinesProps) {
  const [selectedDate, setSelectedDate] = useState(utcDateInputValue);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [selectedDayPosition, setSelectedDayPosition] = useState(1);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ActualExercisePerformance>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tenantId = profile.tenant_id ?? '';
  const { state, reload, savePerformance: saveRoutinePerformance } = useStudentRoutineAssignment(profile.id, tenantId, selectedDate);
  const assignments = state.assignments;
  const priorityAssignment = assignments.find(({ programMode }) => programMode === 'SINGLE_DAY') ?? null;
  const cycleAssignments = priorityAssignment
    ? []
    : assignments.filter(({ programMode }) => programMode === 'CYCLE');
  const executionAssignment = state.execution
    ? assignments.find(({ id }) => id === state.execution?.assignmentId) ?? null
    : null;
  const assignment = priorityAssignment
    ?? assignments.find(({ id }) => id === selectedAssignmentId)
    ?? executionAssignment
    ?? cycleAssignments[0]
    ?? state.assignment;
  const selectedDay = (state.execution && state.execution.assignmentId === assignment?.id
    ? assignment.days.find(({ id }) => id === state.execution?.cycleDayId)
    : undefined)
    ?? assignment?.days.find(({ position }) => position === selectedDayPosition)
    ?? assignment?.days[0];
  const execution = state.execution
    && state.execution.assignmentId === assignment?.id
    && state.execution.cycleDayId === selectedDay?.id
    ? state.execution
    : null;
  const todayUtc = utcDateInputValue();
  const executionEditable = selectedDate === todayUtc
    && (!state.execution || (execution?.status === 'IN_PROGRESS'));
  const slotHistory = selectedDay ? state.cycleSlotHistory[selectedDay.id] : undefined;
  const cycleSlotAttemptsExhausted = Boolean(
    assignment?.programMode === 'CYCLE'
    && !execution
    && (slotHistory?.attemptCount ?? 0) >= assignment.additionalCycleRepeats + 1
  );
  const performanceEditable = executionEditable && !cycleSlotAttemptsExhausted;
  const weekDates = utcWeekInputValues(selectedDate);
  const routineChoices = priorityAssignment
    ? priorityAssignment.days.slice(0, 1).map((day) => ({ assignment: priorityAssignment, day }))
    : cycleAssignments.flatMap((cycleAssignment) => cycleAssignment.days.map((day) => ({
      assignment: cycleAssignment,
      day,
    })));
  const executionChoice = state.execution
    ? routineChoices.find(({ assignment: choiceAssignment, day }) => (
      choiceAssignment.id === state.execution?.assignmentId && day.id === state.execution?.cycleDayId
    )) ?? null
    : null;
  const pendingRoutineChoices = routineChoices.filter(({ assignment: choiceAssignment, day }) => (
    choiceAssignment.id !== executionChoice?.assignment.id || day.id !== executionChoice.day.id
  ));
  const choiceAttemptsExhausted = (choice: typeof routineChoices[number]) => (
    choice.assignment.programMode === 'CYCLE'
    && (state.cycleSlotHistory[choice.day.id]?.attemptCount ?? 0) >= choice.assignment.additionalCycleRepeats + 1
  );
  const routineDetailPanelId = (choice: typeof routineChoices[number]) => `routine-detail-panel-${choice.assignment.id}-${choice.day.id}`;
  const openRoutineChoice = (choice: typeof routineChoices[number]) => {
    setSelectedAssignmentId(choice.assignment.id);
    setSelectedDayPosition(choice.day.position);
    const choiceExecution = state.execution
      && state.execution.assignmentId === choice.assignment.id
      && state.execution.cycleDayId === choice.day.id
      ? state.execution
      : null;
    const firstUncompletedItem = choice.day.items.find((item) => !choiceExecution?.performances[item.id]?.completed);
    setExpandedExerciseId(firstUncompletedItem?.id ?? choice.day.items[0]?.id ?? null);
    setActionError(null);
    window.setTimeout(() => {
      document.getElementById(routineDetailPanelId(choice))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const getPerformanceDraft = (itemId: string): ActualExercisePerformance => (
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

  const updatePerformance = (itemId: string, update: (performance: ActualExercisePerformance) => ActualExercisePerformance) => {
    setDrafts((current) => ({
      ...current,
      [itemId]: update(current[itemId] ?? getPerformanceDraft(itemId)),
    }));
    setActionError(null);
  };

  const saveItemPerformance = async (item: NonNullable<typeof selectedDay>['items'][number]) => {
    if (!assignment || !selectedDay || !executionEditable || cycleSlotAttemptsExhausted || assignment.status !== 'PUBLISHED') return;
    const performance = getPerformanceDraft(item.id);
    try {
      validateActualExercisePerformance(performance, item.baseLoad !== null || item.targetLoad.trim() !== '');
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
      setExpandedExerciseId(null);
      reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo guardar la ejecución.');
    } finally {
      setSavingItemId(null);
    }
  };

  const renderRoutineDetails = () => {
    if (!expandedExerciseId || !selectedDay || !assignment) return null;

    return (
      <div className="space-y-3 border-t border-zinc-800 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">
              {assignment.programMode === 'CYCLE' ? `${selectedDay.title} · ciclo` : 'Rutina del día'}
            </p>
            <h4 className="truncate text-xs font-semibold text-zinc-300">{assignment.title}</h4>
          </div>
          <time className="shrink-0 text-[10px] text-zinc-500" dateTime={selectedDate}>{formatLocalDate(selectedDate)}</time>
        </div>

        {execution && (
          <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-3" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {execution.status === 'COMPLETED' ? 'Rutina completada' : execution.status === 'CLOSED_INCOMPLETE' ? 'Ejecución cerrada' : 'Progreso de hoy'}
                </p>
                <p className="mt-1 text-sm font-bold text-white">{Math.round(execution.progressPercent)}%</p>
              </div>
              <span className="text-xs text-zinc-400">{execution.completedExercises} / {execution.prescribedExercises} ejercicios</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${execution.progressPercent}%` }} />
            </div>
          </section>
        )}

        <div className="space-y-2.5">
          <p className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <Dumbbell size={14} /> {selectedDay.items.length} {selectedDay.items.length === 1 ? 'ejercicio' : 'ejercicios'}
          </p>
          {selectedDay.items.map((item, index) => {
            const performance = getPerformanceDraft(item.id);
            const canSavePerformance = performance.completed || execution?.status === 'IN_PROGRESS';
            const isExpanded = expandedExerciseId === item.id;
            const hasActualValues = performance.actualRepetitions !== null
              || performance.actualLoad !== null
              || performance.rir !== null
              || performance.rpePercent !== null;
            const progressLabel = performance.completed
              ? 'Completado'
              : hasActualValues ? 'En progreso' : performanceEditable ? 'Pendiente' : 'Solo lectura';
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
              <article className="border-t border-zinc-800 pt-3 first:border-t-0 first:pt-0" key={item.id}>
                <button
                  aria-controls={`exercise-record-${item.id}`}
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Ocultar' : performanceEditable ? 'Registrar' : 'Ver'} ${item.exercise.name}. ${progressLabel}`}
                  className="flex min-h-14 w-full items-center gap-3 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                  onClick={() => setExpandedExerciseId(isExpanded ? null : item.id)}
                  type="button"
                >
                  <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${performance.completed ? 'bg-brand-900 text-brand-100' : 'bg-brand-950 text-brand-300'}`}>
                    {performance.completed ? '✓' : String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">{item.exercise.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                      {item.prescribedSets} × {progressionTarget?.repetitions ?? item.prescribedReps}
                      {progressionTarget
                        ? progressionTarget.load === null ? ' · Sin carga' : ` · ${progressionTarget.load} ${progressionTarget.loadUnit}`
                        : item.targetLoad ? ` · ${item.targetLoad}` : ''}
                    </span>
                  </span>
                  <span className={`max-w-14 shrink-0 truncate text-[10px] ${performance.completed ? 'text-brand-200' : 'text-zinc-400'}`}>
                    {performance.completed ? 'Hecho' : hasActualValues ? 'En curso' : performanceEditable ? 'Registrar' : 'Ver'}
                  </span>
                  <ChevronDown aria-hidden="true" className={`shrink-0 text-brand-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} size={16} />
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t border-zinc-800 pt-3" id={`exercise-record-${item.id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] text-zinc-400">{item.exercise.primaryMuscles.map(formatMuscleName).join(', ')}</p>
                        <p className="mt-1 text-[10px] text-zinc-500">{exerciseFocusLabels[item.exercise.focus]}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] ${performance.completed ? 'text-brand-200' : 'text-zinc-500'}`}>{progressLabel}</span>
                    </div>

                    {!execution && !cycleSlotAttemptsExhausted && (
                      <p className="rounded-lg bg-zinc-950 px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
                        Para iniciar tu entrenamiento, marca el ejercicio como hecho y registra las repeticiones y, si aplica, la carga.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {item.exercise.equipment.map((equipment) => (
                        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[9px] text-zinc-500" key={equipment}>
                          {exerciseEquipmentLabels[equipment]}
                        </span>
                      ))}
                      <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[9px] text-zinc-500">
                        {exerciseMovementLabels[item.exercise.movementPattern]}
                      </span>
                    </div>

                    <details className="border-t border-zinc-800 pt-2">
                      <summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-brand-400">Instrucciones y técnica</summary>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{item.exercise.instructions}</p>
                      {item.exercise.tips && <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-amber-200/70">{item.exercise.tips}</p>}
                      <p className="mt-2 text-[10px] text-zinc-500">Descanso: {item.rest}</p>
                      {item.coachInstructions && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">Instrucciones del coach: {item.coachInstructions}</p>}
                      <ExerciseVideoPreview className="mt-3" title={item.exercise.name} videoUrl={item.exercise.videoUrl} />
                    </details>

                    <div className="space-y-3 border-t border-zinc-800 pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">Registro real</h5>
                        <span className="text-[11px] text-zinc-400">{performance.completed ? 'Ejercicio completo' : 'Pendiente'}</span>
                      </div>
                      <div className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2">
                        <label className="flex min-h-11 items-center gap-2 text-[11px] text-zinc-300">
                          <input
                            checked={performance.completed}
                            className="h-5 w-5 accent-brand-500"
                            disabled={!performanceEditable || savingItemId === item.id}
                            onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, completed: event.target.checked }))}
                            type="checkbox"
                          />
                          Hecho
                        </label>
                        <label className="text-[11px] font-medium text-zinc-300">
                          Reps
                          <input aria-label={`Repeticiones reales, ${item.exercise.name}`} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" disabled={!performanceEditable || savingItemId === item.id} min="0" step="1" type="number" value={performance.actualRepetitions ?? ''} onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, actualRepetitions: event.target.value === '' ? null : Number(event.target.value) }))} />
                        </label>
                        <label className="text-[11px] font-medium text-zinc-300">
                          Carga
                          <input aria-label={`Carga real, ${item.exercise.name}`} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" disabled={!performanceEditable || savingItemId === item.id} min="0" step="1" type="number" value={performance.actualLoad ?? ''} onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, actualLoad: event.target.value === '' ? null : Number(event.target.value), loadUnit: event.target.value === '' ? null : (current.loadUnit ?? item.loadUnit ?? 'kg') }))} />
                        </label>
                        <select aria-label={`Unidad de carga, ${item.exercise.name}`} className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200" disabled={!performanceEditable || savingItemId === item.id || performance.actualLoad === null} value={performance.loadUnit ?? item.loadUnit ?? 'kg'} onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, loadUnit: event.target.value as 'lbs' | 'kg' }))}>
                          <option value="kg">kg</option>
                          <option value="lbs">lbs</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block text-[11px] text-zinc-300">
                          <span className="flex justify-between"><span>RIR</span><span>{performance.rir ?? 'Sin registrar'} · 1-10</span></span>
                          <input aria-label={`RIR de ${item.exercise.name}`} className="mt-2 w-full accent-brand-500" disabled={!performanceEditable || savingItemId === item.id} max="10" min="1" onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, rir: Number(event.target.value) }))} type="range" value={performance.rir ?? 1} />
                        </label>
                        <label className="block text-[11px] text-zinc-300">
                          <span className="flex justify-between"><span>RPE</span><span>{performance.rpePercent === null ? 'Sin registrar' : `${performance.rpePercent}%`} · 0-100%</span></span>
                          <input aria-label={`RPE de ${item.exercise.name}`} className="mt-2 w-full accent-brand-500" disabled={!performanceEditable || savingItemId === item.id} max="100" min="0" onChange={(event) => updatePerformance(item.id, (current) => ({ ...current, rpePercent: Number(event.target.value) }))} type="range" value={performance.rpePercent ?? 0} />
                        </label>
                      </div>

                      {executionEditable && (
                        <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-xs font-bold text-white hover:bg-brand-500 disabled:opacity-50" disabled={savingItemId === item.id || !canSavePerformance || cycleSlotAttemptsExhausted} onClick={() => void saveItemPerformance(item)} type="button">
                          {savingItemId === item.id ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />}
                          Guardar ejercicio
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Header title="Entrenamiento" subtitle="Tus rutinas personalizadas" />

      <section aria-label="Calendario de entrenamientos" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            aria-label="Semana anterior"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
            onClick={() => {
              setSelectedDate(shiftUtcDate(selectedDate, -7));
              setExpandedExerciseId(null);
            }}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={17} />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-xs font-semibold text-zinc-200">
              {`Semana del ${formatLocalDate(weekDates[0], { day: 'numeric', month: 'long' })} al ${formatLocalDate(weekDates[6], { day: 'numeric', month: 'long' })}`}
            </p>
            <p className="text-[10px] text-zinc-500">{selectedDate === todayUtc ? 'Hoy · fecha UTC' : 'Fecha UTC'}</p>
          </div>
          <button
            aria-label="Semana siguiente"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
            onClick={() => {
              setSelectedDate(shiftUtcDate(selectedDate, 7));
              setExpandedExerciseId(null);
            }}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1" role="group" aria-label="Días de la semana">
          {weekDates.map((date) => {
            const dateObject = new Date(`${date}T12:00:00.000Z`);
            const weekday = new Intl.DateTimeFormat('es', { weekday: 'short', timeZone: 'UTC' })
              .format(dateObject)
              .replace('.', '');
            const isSelected = date === selectedDate;
            const isToday = date === todayUtc;
            const hasExecution = state.executionDates.includes(date);
            return (
              <button
                aria-label={`${new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dateObject)}${isToday ? ', hoy' : ''}${hasExecution ? ', entrenamiento registrado' : ''}`}
                aria-pressed={isSelected}
                className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 ${isSelected ? 'bg-brand-600 font-bold text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                key={date}
                onClick={() => {
                  setSelectedDate(date);
                  setExpandedExerciseId(null);
                }}
                type="button"
              >
                <span className="uppercase">{weekday}</span>
                <span className="text-xs">{date.slice(8, 10).replace(/^0/, '')}</span>
                <span aria-hidden="true" className={`h-1 w-1 rounded-full ${hasExecution ? 'bg-brand-200' : isToday && !isSelected ? 'bg-brand-400' : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>
      </section>

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
          <section aria-labelledby="completed-routines-heading" className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-white" id="completed-routines-heading">
                {selectedDate === todayUtc ? 'Lo que ya hiciste hoy' : 'Lo que hiciste en esta fecha'}
              </h2>
              {executionChoice && (
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold ${execution?.status === 'COMPLETED' ? 'border-brand-800 bg-brand-950 text-brand-100' : 'border-brand-900 bg-brand-950 text-brand-300'}`}>
                  {execution?.status === 'COMPLETED' ? 'Hecho' : execution?.status === 'IN_PROGRESS' ? 'En curso' : 'Cerrado'}
                </span>
              )}
            </div>

            {executionChoice && state.execution ? (
              <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${state.execution.status === 'COMPLETED' ? 'bg-brand-900 text-brand-100' : 'bg-brand-950 text-brand-300'}`}>
                    {state.execution.status === 'COMPLETED' ? <CircleCheck aria-hidden="true" size={18} /> : <Dumbbell aria-hidden="true" size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-white">
                      {executionChoice.assignment.programMode === 'CYCLE' ? executionChoice.day.title : executionChoice.assignment.title}
                    </h3>
                    <p className="truncate text-[11px] text-zinc-400">
                      {executionChoice.day.items.length} {executionChoice.day.items.length === 1 ? 'ejercicio' : 'ejercicios'} · {executionChoice.assignment.title}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-brand-300">{Math.round(state.execution.progressPercent)}%</span>
                </div>
                <button
                  aria-controls={routineDetailPanelId(executionChoice)}
                  aria-expanded={Boolean(expandedExerciseId && assignment?.id === executionChoice.assignment.id && selectedDay?.id === executionChoice.day.id)}
                  className={`mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold ${selectedDate === todayUtc ? 'bg-brand-600 text-white hover:bg-brand-500' : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
                  onClick={() => {
                    if (expandedExerciseId && assignment?.id === executionChoice.assignment.id && selectedDay?.id === executionChoice.day.id) {
                      setExpandedExerciseId(null);
                    } else {
                      openRoutineChoice(executionChoice);
                    }
                  }}
                  type="button"
                >
                  {expandedExerciseId && assignment?.id === executionChoice.assignment.id && selectedDay?.id === executionChoice.day.id
                    ? 'Cerrar rutina'
                    : state.execution.status === 'IN_PROGRESS' && selectedDate === todayUtc ? 'Continuar entrenamiento' : 'Ver rutina'}
                  <ChevronRight aria-hidden="true" className={`transition-transform ${expandedExerciseId && assignment?.id === executionChoice.assignment.id && selectedDay?.id === executionChoice.day.id ? 'rotate-90' : ''}`} size={15} />
                </button>
                <div id={routineDetailPanelId(executionChoice)} hidden={!(expandedExerciseId && assignment?.id === executionChoice.assignment.id && selectedDay?.id === executionChoice.day.id)}>
                  {expandedExerciseId && assignment?.id === executionChoice.assignment.id && selectedDay?.id === executionChoice.day.id && renderRoutineDetails()}
                </div>
              </article>
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-xs text-zinc-500">
                Aún no has iniciado un entrenamiento en esta fecha.
              </p>
            )}
          </section>

          <section aria-labelledby="next-routines-heading" className="space-y-2.5">
            <div>
              <h2 className="font-display text-base font-bold leading-tight text-white" id="next-routines-heading">
                Escoge tu siguiente entrenamiento
              </h2>
              {assignment.programMode === 'CYCLE' && (
                <p className="mt-1 text-[11px] text-zinc-500">Puedes elegir los días del ciclo en cualquier orden.</p>
              )}
            </div>

            {pendingRoutineChoices.map((choice) => {
              const isExhausted = choiceAttemptsExhausted(choice);
              const dateIsReadOnly = selectedDate !== todayUtc;
              const anotherRoutineStarted = Boolean(state.execution);
              const unavailable = isExhausted || anotherRoutineStarted || dateIsReadOnly;
              const actionDisabled = isExhausted || anotherRoutineStarted;
              const isExpanded = Boolean(
                expandedExerciseId
                && assignment?.id === choice.assignment.id
                && selectedDay?.id === choice.day.id
              );
              const detailsId = routineDetailPanelId(choice);
              const remainingAttempts = choice.assignment.programMode === 'CYCLE'
                ? Math.max(0, choice.assignment.additionalCycleRepeats + 1 - (state.cycleSlotHistory[choice.day.id]?.attemptCount ?? 0))
                : null;
              return (
                <article className={`rounded-xl border bg-zinc-900 p-3 ${unavailable ? 'border-zinc-800 opacity-70' : 'border-zinc-800'}`} key={`${choice.assignment.id}:${choice.day.id}`}>
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${unavailable ? 'bg-zinc-800 text-zinc-500' : 'bg-brand-950 text-brand-300'}`}>
                      <Dumbbell size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-white">
                        {choice.assignment.programMode === 'CYCLE' ? choice.day.title : choice.assignment.title}
                      </h3>
                      <p className="truncate text-[11px] text-zinc-400">
                        {choice.day.items.length} {choice.day.items.length === 1 ? 'ejercicio' : 'ejercicios'} · {choice.assignment.programMode === 'CYCLE' ? choice.assignment.title : choice.day.items.map(({ exercise }) => exercise.name).join(', ')}
                      </p>
                    </div>
                    {isExhausted ? (
                      <span className="shrink-0 text-[10px] text-zinc-500">Intentos usados</span>
                    ) : dateIsReadOnly ? (
                      <span className="shrink-0 text-[10px] text-zinc-500">Solo lectura</span>
                    ) : anotherRoutineStarted ? (
                      <span className="shrink-0 text-[10px] text-zinc-500">Mañana</span>
                    ) : (
                      <span className="shrink-0 text-[9px] text-zinc-500">{remainingAttempts !== null ? `${remainingAttempts} ${remainingAttempts === 1 ? 'intento' : 'intentos'}` : 'Rutina del día'}</span>
                    )}
                    <button
                      aria-controls={detailsId}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Cerrar' : dateIsReadOnly || unavailable ? 'Ver' : 'Abrir'} ${choice.day.title}`}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${actionDisabled ? 'cursor-not-allowed bg-zinc-800 text-zinc-500' : dateIsReadOnly ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-brand-700 text-white hover:bg-brand-600'}`}
                      disabled={actionDisabled}
                      onClick={() => {
                        if (isExpanded) setExpandedExerciseId(null);
                        else openRoutineChoice(choice);
                      }}
                      title={isExpanded ? 'Replegar rutina' : dateIsReadOnly ? 'Consultar rutina' : actionDisabled ? 'No disponible en esta fecha' : 'Abrir rutina'}
                      type="button"
                    >
                      {isExpanded
                        ? <ChevronDown aria-hidden="true" className="rotate-180" size={17} />
                        : <Play aria-hidden="true" fill="currentColor" size={15} />}
                    </button>
                  </div>
                  <div id={detailsId} hidden={!isExpanded}>
                    {isExpanded && renderRoutineDetails()}
                  </div>
                </article>
              );
            })}

            {pendingRoutineChoices.length === 0 && !executionChoice && (
              <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-xs text-zinc-500">
                Tu coach aún no tiene otro entrenamiento disponible para esta fecha.
              </p>
            )}
            {pendingRoutineChoices.length === 0 && executionChoice && state.execution?.status !== 'IN_PROGRESS' && (
              <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-xs text-zinc-500">
                {selectedDate === todayUtc
                  ? 'Ya realizaste tu entrenamiento en esta fecha. Puedes elegir otro mañana.'
                  : 'La fecha ya cerró. Puedes consultar la rutina, pero el registro permanece en solo lectura.'}
              </p>
            )}
          </section>

          {actionError && <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{actionError}</p>}
          {notice && <p className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs text-emerald-300" role="status">{notice}</p>}
          {!executionEditable && <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-500">La ejecución solo se puede registrar o retomar en el mismo día que se inició.</p>}
          {cycleSlotAttemptsExhausted && <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-500">Este día del ciclo ya agotó sus intentos configurados.</p>}
        </>
      )}
    </div>
  );
}
