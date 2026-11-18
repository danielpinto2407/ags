import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck, Dumbbell, Eye, LoaderCircle, Play } from 'lucide-react';
import { useState } from 'react';
import Header from '@/components/Header';
import { useStudentRoutineAssignment } from '@/app/useStudentRoutineAssignment';
import { formatLocalDate, shiftUtcDate, utcDateInputValue, utcWeekInputValues } from '@/domain/localDate';
import { getCurrentCycleIteration, getCycleIterationCount, isCycleSlotAvailable } from '@/domain/trainingCycle';
import type { Profile } from '@/domain/profile';
import type { RoutineAssignment, RoutineAssignmentDay } from '@/domain/routineAssignment';
import type { StudentRoutineTarget } from '@/types';

interface StudentRoutinesProps {
  profile: Profile;
  initialDate?: string;
  onStartTraining: (target: StudentRoutineTarget) => void;
}

interface RoutineChoice {
  assignment: RoutineAssignment;
  day: RoutineAssignmentDay;
  iteration: number | null;
}

export default function StudentRoutines({ profile, initialDate, onStartTraining }: StudentRoutinesProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate ?? utcDateInputValue());
  const tenantId = profile.tenant_id ?? '';
  const { state, reload } = useStudentRoutineAssignment(profile.id, tenantId, selectedDate);
  const assignments = state.assignments;
  const today = utcDateInputValue();
  const isSelectedDateToday = selectedDate === today;
  const singleDayAssignment = assignments.find(({ programMode }) => programMode === 'SINGLE_DAY') ?? null;
  const cycleAssignments = singleDayAssignment
    ? []
    : assignments.filter(({ programMode }) => programMode === 'CYCLE');
  const weekDates = utcWeekInputValues(selectedDate);

  const allChoices: RoutineChoice[] = singleDayAssignment
    ? singleDayAssignment.days.map((day) => ({ assignment: singleDayAssignment, day, iteration: null }))
    : cycleAssignments.flatMap((assignment) => assignment.days.map((day) => ({
      assignment,
      day,
      iteration: null,
    })));

  const availableChoices: RoutineChoice[] = singleDayAssignment
    ? allChoices
    : cycleAssignments.flatMap((assignment) => {
      const currentIteration = getCurrentCycleIteration(assignment.days.map(
        (day) => state.cycleSlotHistory[day.id]?.terminalAttemptCount ?? 0
      ));
      return assignment.days
        .filter((day) => isCycleSlotAvailable(
          assignment.additionalCycleRepeats,
          state.cycleSlotHistory[day.id]?.attemptCount ?? 0,
          state.cycleSlotHistory[day.id]?.terminalAttemptCount ?? 0,
          currentIteration
        ))
        .map((day) => ({ assignment, day, iteration: currentIteration }));
    });

  const executionChoice = state.execution
    ? allChoices.find(({ assignment, day }) => (
      assignment.id === state.execution?.assignmentId && day.id === state.execution?.cycleDayId
    )) ?? null
    : null;
  const pendingChoices = availableChoices.filter(({ assignment, day }) => (
    assignment.id !== executionChoice?.assignment.id || day.id !== executionChoice?.day.id
  ));
  const hasAnyCycle = cycleAssignments.length > 0;

  const openTraining = (choice: RoutineChoice) => {
    onStartTraining({
      assignmentId: choice.assignment.id,
      cycleDayPosition: choice.day.position,
      executionDate: selectedDate,
    });
  };

  const changeWeek = (dayOffset: number) => setSelectedDate(shiftUtcDate(selectedDate, dayOffset));

  const dayLabel = (date: string) => {
    const dateObject = new Date(`${date}T12:00:00.000Z`);
    const weekday = new Intl.DateTimeFormat('es', { weekday: 'short', timeZone: 'UTC' })
      .format(dateObject)
      .replace('.', '');
    return { dateObject, weekday };
  };

  return (
    <div className="space-y-4 pb-2">
      <Header title="Entrenar" subtitle="Tus rutinas" />

      <section aria-label="Calendario de entrenamientos" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button aria-label="Semana anterior" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" onClick={() => changeWeek(-7)} type="button">
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-xs font-semibold text-zinc-200">
              Semana del {formatLocalDate(weekDates[0], { day: 'numeric', month: 'long' })} al {formatLocalDate(weekDates[6], { day: 'numeric', month: 'long' })}
            </p>
            <p className="text-[10px] text-zinc-500">{isSelectedDateToday ? 'Hoy' : formatLocalDate(selectedDate)}</p>
          </div>
          <button aria-label="Semana siguiente" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" onClick={() => changeWeek(7)} type="button">
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
        <div aria-label="Días de la semana" className="grid grid-cols-7 gap-1" role="group">
          {weekDates.map((date) => {
            const { dateObject, weekday } = dayLabel(date);
            const isSelected = date === selectedDate;
            const hasExecution = state.executionDates.includes(date);
            const isToday = date === today;
            return (
              <button
                aria-label={`${new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dateObject)}${isToday ? ', hoy' : ''}${hasExecution ? ', entrenamiento registrado' : ''}`}
                aria-pressed={isSelected}
                className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 ${isSelected ? 'bg-brand-600 font-bold text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                key={date}
                onClick={() => setSelectedDate(date)}
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
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400" role="status">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> Cargando entrenamientos…
        </p>
      )}

      {state.status === 'error' && (
        <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-4" role="alert">
          <p className="text-sm text-rose-200">{state.message}</p>
          <button className="mt-2 text-xs font-semibold text-rose-100 underline underline-offset-2" onClick={reload} type="button">Intentar de nuevo</button>
        </div>
      )}

      {state.status === 'loaded' && assignments.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center">
          <CalendarDays aria-hidden="true" className="mx-auto mb-3 text-zinc-500" size={25} />
          <p className="text-sm font-semibold text-zinc-200">No hay un entrenamiento asignado para este día</p>
          <p className="mt-1 text-xs text-zinc-400">Tu coach puede asignarte una rutina.</p>
        </div>
      )}

      {state.status === 'loaded' && assignments.length > 0 && (
        <>
          <section aria-labelledby="completed-routines-heading" className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-white" id="completed-routines-heading">
                {isSelectedDateToday ? 'Lo que ya hiciste hoy' : 'Lo que hiciste en esta fecha'}
              </h2>
              {executionChoice && state.execution && (
                <span className="shrink-0 rounded-full border border-brand-800 bg-brand-950 px-2 py-1 text-[9px] font-semibold text-brand-100">
                  {state.execution.status === 'COMPLETED' ? 'Hecho' : state.execution.status === 'IN_PROGRESS' ? 'En curso' : 'Incompleto'}
                </span>
              )}
            </div>
            {executionChoice && state.execution ? (
              <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-900 text-brand-100">
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
                  <span className="shrink-0 text-right">
                    <span className="block text-xs font-bold text-brand-200">{Math.round(state.execution.progressPercent)}%</span>
                    <span className="block text-[9px] text-zinc-400">
                      {state.execution.progressUnit === 'sets'
                        ? `${state.execution.completedSets}/${state.execution.prescribedSets} series`
                        : `${state.execution.completedExercises}/${state.execution.prescribedExercises} ejercicios`}
                    </span>
                  </span>
                </div>
                <button className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" onClick={() => openTraining(executionChoice)} type="button">
                  {state.execution.status === 'IN_PROGRESS' && isSelectedDateToday ? 'Continuar' : 'Ver entrenamiento'}
                  <ChevronRight aria-hidden="true" size={16} />
                </button>
              </article>
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-xs text-zinc-400">
                Aún no has empezado un entrenamiento en esta fecha.
              </p>
            )}
          </section>

          <section aria-labelledby="next-routines-heading" className="space-y-2.5">
            <div>
              <h2 className="font-display text-base font-bold leading-tight text-white" id="next-routines-heading">
                {hasAnyCycle ? 'Elige tu siguiente entrenamiento' : 'Entrenamiento disponible'}
              </h2>
            </div>
            {pendingChoices.map((choice) => {
              const history = state.cycleSlotHistory[choice.day.id];
              const nextTrainingBlocked = isSelectedDateToday && Boolean(state.execution);
              const remainingAttempts = choice.assignment.programMode === 'CYCLE'
                ? Math.max(0, getCycleIterationCount(choice.assignment.additionalCycleRepeats) - (history?.attemptCount ?? 0))
                : null;
              const isViewOnly = !isSelectedDateToday;
              const unavailable = nextTrainingBlocked;
              return (
                <article className={`rounded-xl border border-zinc-800 bg-zinc-900 p-3 ${unavailable ? 'opacity-65' : ''}`} key={`${choice.assignment.id}:${choice.day.id}`}>
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${unavailable ? 'bg-zinc-800 text-zinc-400' : 'bg-brand-950 text-brand-200'}`}>
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
                    {nextTrainingBlocked ? (
                      <span className="shrink-0 text-[10px] text-zinc-400">Mañana</span>
                    ) : remainingAttempts !== null ? (
                      <span className="shrink-0 text-[9px] text-zinc-400">Ciclo {choice.iteration}</span>
                    ) : (
                      <span className="shrink-0 text-[9px] text-zinc-400">Fecha asignada</span>
                    )}
                    <button
                      aria-label={`${isViewOnly ? 'Consultar' : unavailable ? 'No disponible' : 'Abrir'} ${choice.day.title}`}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${unavailable ? 'cursor-not-allowed bg-zinc-800 text-zinc-500' : 'bg-brand-700 text-white hover:bg-brand-600'}`}
                      disabled={unavailable}
                      onClick={() => openTraining(choice)}
                      type="button"
                    >
                      {isViewOnly ? <Eye aria-hidden="true" size={17} /> : <Play aria-hidden="true" fill="currentColor" size={16} />}
                    </button>
                  </div>
                </article>
              );
            })}

            {pendingChoices.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-xs text-zinc-400">
                {!isSelectedDateToday
                  ? 'No hay otros entrenamientos disponibles para esta fecha.'
                  : state.execution
                    ? hasAnyCycle
                      ? 'Ya registraste un entrenamiento hoy. Podrás continuar mañana.'
                      : 'Ya completaste el entrenamiento de hoy. Tu progreso aparece arriba.'
                    : hasAnyCycle
                      ? 'Ya completaste todos los entrenamientos disponibles.'
                      : 'No hay otro entrenamiento disponible para hoy.'}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
