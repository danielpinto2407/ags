import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, LoaderCircle, RefreshCw } from 'lucide-react';
import { routineAssignmentRepository } from '@/data/routineAssignmentRepository';
import { formatLocalDate } from '@/domain/localDate';
import type { CoachMember } from '@/domain/coachMember';
import type {
  CoachRoutineExecutionReview,
  CoachRoutineExecutionSummary,
} from '@/domain/workoutExecution';

interface CoachStudentWorkoutHistoryProps {
  coachId: string;
  tenantId: string | null;
  member: CoachMember;
}

type HistoryState =
  | { status: 'loading'; entries: CoachRoutineExecutionSummary[] }
  | { status: 'error'; entries: CoachRoutineExecutionSummary[]; message: string }
  | { status: 'loaded'; entries: CoachRoutineExecutionSummary[] };

type ReviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; review: CoachRoutineExecutionReview };

const executionStatusLabels = {
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
  CLOSED_INCOMPLETE: 'Incompleto',
} as const;

export default function CoachStudentWorkoutHistory({ coachId, tenantId, member }: CoachStudentWorkoutHistoryProps) {
  const [historyState, setHistoryState] = useState<HistoryState>({ status: 'loading', entries: [] });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>({ status: 'idle' });
  const [reviewReloadKey, setReviewReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setHistoryState((current) => ({ status: 'loading', entries: current.entries }));

    if (!tenantId || member.status !== 'ACTIVE') {
      setHistoryState({ status: 'loaded', entries: [] });
      setSelectedExecutionId(null);
      setReviewState({ status: 'idle' });
      return () => { cancelled = true; };
    }

    routineAssignmentRepository.listCoachStudentExecutionHistory(member.id, tenantId, coachId)
      .then((entries) => {
        if (!cancelled) setHistoryState({ status: 'loaded', entries });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHistoryState({
            status: 'error',
            entries: [],
            message: error instanceof Error ? error.message : 'No se pudo cargar el historial de entrenamientos.',
          });
        }
      });

    return () => { cancelled = true; };
  }, [coachId, member.id, member.status, reloadKey, tenantId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedExecutionId || !tenantId || member.status !== 'ACTIVE') {
      setReviewState({ status: 'idle' });
      return () => { cancelled = true; };
    }

    setReviewState({ status: 'loading' });
    routineAssignmentRepository.getCoachStudentExecutionReview(
      member.id,
      tenantId,
      coachId,
      selectedExecutionId
    )
      .then((review) => {
        if (cancelled) return;
        if (!review) {
          setReviewState({ status: 'error', message: 'Este entrenamiento ya no está disponible.' });
          return;
        }
        setReviewState({ status: 'loaded', review });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setReviewState({
            status: 'error',
            message: error instanceof Error ? error.message : 'No se pudo cargar el detalle del entrenamiento.',
          });
        }
      });

    return () => { cancelled = true; };
  }, [coachId, member.id, member.status, reviewReloadKey, selectedExecutionId, tenantId]);

  const toggleExecution = (executionId: string) => {
    setSelectedExecutionId((current) => current === executionId ? null : executionId);
  };

  return (
    <section aria-labelledby="student-workout-history-heading" className="space-y-3">
      <div>
        <h3 className="font-display text-base font-bold text-white" id="student-workout-history-heading">Progreso de entrenamientos</h3>
        <p className="mt-1 text-xs text-zinc-400">Consulta sus resultados por rutina y fecha.</p>
      </div>

      {member.status !== 'ACTIVE' ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-sm text-zinc-400">
          El historial no está disponible mientras la cuenta de la alumna esté inactiva.
        </p>
      ) : historyState.status === 'loading' && historyState.entries.length === 0 ? (
        <p className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-400" role="status">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> Cargando entrenamientos…
        </p>
      ) : historyState.status === 'error' ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-900/60 bg-rose-950/20 p-3" role="alert">
          <p className="text-sm text-rose-200">{historyState.message}</p>
          <button
            aria-label="Volver a cargar entrenamientos"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-rose-200 hover:bg-rose-950/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
            onClick={() => setReloadKey((key) => key + 1)}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={16} />
          </button>
        </div>
      ) : historyState.entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-sm text-zinc-400">
          Aún no hay entrenamientos registrados para esta alumna.
        </p>
      ) : (
        <ol aria-label="Entrenamientos registrados" className="space-y-2">
          {historyState.entries.map((entry) => {
            const isSelected = selectedExecutionId === entry.id;
            const title = entry.programMode === 'CYCLE' ? entry.cycleDayTitle ?? entry.title : entry.title;
            return (
              <li key={entry.id}>
                <article className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                  <button
                    aria-controls={`coach-workout-review-${entry.id}`}
                    aria-expanded={isSelected}
                    className="flex min-h-16 w-full items-center gap-3 p-3 text-left hover:bg-zinc-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brand-400"
                    onClick={() => toggleExecution(entry.id)}
                    type="button"
                  >
                    {isSelected
                      ? <ChevronDown aria-hidden="true" className="shrink-0 text-brand-300" size={17} />
                      : <ChevronRight aria-hidden="true" className="shrink-0 text-zinc-400" size={17} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{title}</span>
                      <span className="mt-0.5 block text-xs text-zinc-400">
                        {formatLocalDate(entry.executionDate)}
                        {entry.slotAttempt !== null ? ` · Vuelta ${entry.slotAttempt}` : ''}
                        {' · '}{executionStatusLabels[entry.status]}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold text-brand-200">{Math.round(entry.progressPercent)}%</span>
                      <span className="block text-[10px] text-zinc-400">{entry.completedExercises}/{entry.prescribedExercises} ejercicios</span>
                    </span>
                  </button>
                  <span
                    aria-label={`${Math.round(entry.progressPercent)}% de ejercicios completados`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={Math.round(entry.progressPercent)}
                    className="block h-1 w-full bg-zinc-800"
                    role="progressbar"
                  >
                    <span className="block h-full bg-brand-500" style={{ width: `${entry.progressPercent}%` }} />
                  </span>

                  <div className="border-t border-zinc-800 p-3" hidden={!isSelected} id={`coach-workout-review-${entry.id}`}>
                    {isSelected && reviewState.status === 'loading' && (
                      <p className="flex items-center justify-center gap-2 py-5 text-sm text-zinc-400" role="status">
                        <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> Cargando detalle…
                      </p>
                    )}
                    {isSelected && reviewState.status === 'error' && (
                      <div className="flex items-center justify-between gap-3 py-2" role="alert">
                        <p className="text-sm text-rose-200">{reviewState.message}</p>
                        <button
                          className="min-h-10 shrink-0 rounded-lg border border-rose-900/60 px-3 text-xs font-semibold text-rose-100 hover:bg-rose-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
                          onClick={() => setReviewReloadKey((key) => key + 1)}
                          type="button"
                        >
                          Reintentar
                        </button>
                      </div>
                    )}
                    {isSelected && reviewState.status === 'loaded' && reviewState.review.id === entry.id && (
                      <div className="space-y-3">
                        <p className="text-[11px] leading-relaxed text-zinc-400">
                          La columna de prescripción muestra el objetivo; el registro refleja lo que realizó la alumna.
                        </p>
                        {reviewState.review.exercises.map((exercise) => (
                          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-3" key={exercise.id}>
                            <h4 className="text-sm font-semibold text-white">{exercise.position + 1}. {exercise.name}</h4>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                              <div className="min-w-0">
                                <p className="font-semibold text-zinc-400">Prescripción</p>
                                <p className="mt-1 text-zinc-200">{exercise.prescribedSets} × {exercise.prescribedRepetitions}</p>
                                {exercise.prescribedLoad && <p className="mt-1 text-zinc-300">{exercise.prescribedLoad}</p>}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-zinc-400">Registro</p>
                                <p className="mt-1 text-zinc-200">
                                  {exercise.completed ? 'Completado' : 'Incompleto'}
                                  {exercise.actualRepetitions !== null ? ` · ${exercise.actualRepetitions} rep.` : ''}
                                </p>
                                {exercise.actualLoad !== null && (
                                  <p className="mt-1 text-zinc-300">{exercise.actualLoad} {exercise.loadUnit}</p>
                                )}
                                {exercise.rir !== null && <p className="mt-1 text-zinc-300">RIR {exercise.rir}</p>}
                                {exercise.rpePercent !== null && <p className="mt-1 text-zinc-300">RPE {exercise.rpePercent}%</p>}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
