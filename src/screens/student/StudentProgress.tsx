import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, ChartNoAxesColumnIncreasing, Send } from 'lucide-react';
import Header from '@/components/Header';
import TenantLoadingIndicator from '@/components/TenantLoadingIndicator';
import { routineAssignmentRepository } from '@/data/routineAssignmentRepository';
import type { StudentRoutineHistoryEntry, WorkoutComment } from '@/domain/workoutExecution';
import { formatLocalDate } from '@/domain/localDate';
import type { Profile } from '@/domain/profile';
import type { Screen } from '@/types';

interface StudentProgressProps {
  profile: Profile;
  onNavigate: (screen: Screen) => void;
}

type StudentProgressState =
  | { status: 'loading'; entries: StudentRoutineHistoryEntry[] }
  | { status: 'error'; entries: StudentRoutineHistoryEntry[]; message: string }
  | { status: 'loaded'; entries: StudentRoutineHistoryEntry[] };

const executionStatusLabels = {
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CLOSED_INCOMPLETE: 'Incompleta',
} as const;

export default function StudentProgress({ profile, onNavigate }: StudentProgressProps) {
  const [state, setState] = useState<StudentProgressState>({ status: 'loading', entries: [] });
  const [reloadKey, setReloadKey] = useState(0);
  const [commentsByExecution, setCommentsByExecution] = useState<Record<string, WorkoutComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [sendingComments, setSendingComments] = useState<Record<string, boolean>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const loadedEntries = state.status === 'loaded' ? state.entries : null;

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ status: 'loading', entries: current.entries }));

    if (!profile.tenant_id) {
      setState({ status: 'error', entries: [], message: 'No se encontró el gimnasio de tu cuenta.' });
      return () => { cancelled = true; };
    }

    routineAssignmentRepository.listRecentHistory(profile.id, profile.tenant_id)
      .then((entries) => {
        if (!cancelled) setState({ status: 'loaded', entries });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            entries: [],
            message: error instanceof Error ? error.message : 'No se pudo cargar tu historial.',
          });
        }
      });

    return () => { cancelled = true; };
  }, [profile.id, profile.tenant_id, reloadKey]);

  useEffect(() => {
    if (!loadedEntries || !profile.tenant_id) return;
    let cancelled = false;
    void Promise.all(loadedEntries.map(async (entry) => {
      const comments = await routineAssignmentRepository.listWorkoutComments(entry.id, profile.tenant_id as string);
      return [entry.id, comments] as const;
    }))
      .then((entries) => {
        if (!cancelled) setCommentsByExecution(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!cancelled) setCommentsByExecution({});
      });
    return () => { cancelled = true; };
  }, [loadedEntries, profile.tenant_id]);

  const sendComment = async (executionId: string) => {
    if (!profile.tenant_id) return;
    setSendingComments((current) => ({ ...current, [executionId]: true }));
    setCommentErrors((current) => ({ ...current, [executionId]: '' }));
    try {
      const comment = await routineAssignmentRepository.createWorkoutComment(executionId, profile.tenant_id, commentDrafts[executionId] ?? '');
      setCommentsByExecution((current) => ({
        ...current,
        [executionId]: [...(current[executionId] ?? []), comment],
      }));
      setCommentDrafts((current) => ({ ...current, [executionId]: '' }));
    } catch (error) {
      setCommentErrors((current) => ({
        ...current,
        [executionId]: error instanceof Error ? error.message : 'No se pudo publicar el comentario.',
      }));
    } finally {
      setSendingComments((current) => ({ ...current, [executionId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <Header title="Mi Progreso" subtitle="Historial de entrenamientos" showBell={false} />

      {state.status === 'loading' && (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500" role="status">
          <TenantLoadingIndicator size={17} /> Cargando tu historial…
        </p>
      )}

      {state.status === 'error' && (
        <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-4" role="alert">
          <p className="text-sm text-rose-300">{state.message}</p>
          <button className="mt-2 text-xs font-semibold text-rose-200 underline underline-offset-2" onClick={() => setReloadKey((key) => key + 1)} type="button">
            Reintentar
          </button>
        </div>
      )}

      {state.status === 'loaded' && state.entries.length === 0 && (
        <div className="max-w-lg rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center">
          <ChartNoAxesColumnIncreasing aria-hidden="true" className="mx-auto mb-3 text-zinc-600" size={27} />
          <p className="text-sm font-semibold text-zinc-300">Aún no tienes entrenamientos registrados</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
            Cuando registres tu primer ejercicio, tus entrenamientos aparecerán aquí.
          </p>
          <button className="mx-auto mt-4 flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-xs font-bold text-white hover:bg-brand-action-hover" onClick={() => onNavigate('routines')} type="button">
            Ir a entrenar <ArrowRight aria-hidden="true" size={14} />
          </button>
        </div>
      )}

      {state.status === 'loaded' && state.entries.length > 0 && (
        <ol aria-label="Sesiones registradas" className="max-w-3xl space-y-2.5">
          {state.entries.map((entry) => (
            <li key={entry.id}>
              <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-900/50 bg-brand-950/30 text-brand-300">
                    <CalendarDays aria-hidden="true" size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <time className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500" dateTime={entry.executionDate}>
                      {formatLocalDate(entry.executionDate)}
                    </time>
                    <h2 className="mt-1 text-sm font-bold text-white">{entry.title}</h2>
                    {entry.cycleDayTitle && entry.slotAttempt !== null && <p className="mt-0.5 text-xs text-zinc-400">{entry.cycleDayTitle} · Ciclo {entry.slotAttempt}</p>}
                  </div>
                  <span className="shrink-0 rounded-full border border-zinc-700 px-2 py-1 text-[9px] font-semibold text-zinc-300">
                    {executionStatusLabels[entry.status]}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-zinc-400">
                      {entry.completedUnits} de {entry.prescribedUnits} {entry.progressUnit === 'sets'
                        ? entry.prescribedUnits === 1 ? 'serie' : 'series'
                        : entry.prescribedUnits === 1 ? 'ejercicio' : 'ejercicios'}
                    </span>
                    <span className="font-semibold text-brand-300">{Math.round(entry.progressPercent)}%</span>
                  </div>
                  <div aria-label={`${Math.round(entry.progressPercent)}% completado`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.round(entry.progressPercent)} className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800" role="progressbar">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${entry.progressPercent}%` }} />
                  </div>
                </div>
                <section className="mt-4 border-t border-zinc-800 pt-3" aria-label="Comentarios del entrenamiento">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Comentarios</h3>
                  {(commentsByExecution[entry.id] ?? []).length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">Aún no hay comentarios sobre este entrenamiento.</p>
                  ) : (
                    <ol className="mt-2 space-y-2">
                      {(commentsByExecution[entry.id] ?? []).map((comment) => (
                        <li className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3" key={comment.id}>
                          <p className="text-[10px] font-semibold text-brand-300">
                            {comment.authorName} · {formatLocalDate(comment.createdAt.slice(0, 10))}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-100">{comment.body}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                  {commentErrors[entry.id] && <p className="mt-2 text-xs text-rose-300" role="alert">{commentErrors[entry.id]}</p>}
                  <div className="mt-3 flex items-end gap-2">
                    <textarea
                      aria-label="Responder comentario"
                      className="min-h-20 flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none"
                      maxLength={2000}
                      onChange={(event) => setCommentDrafts((current) => ({ ...current, [entry.id]: event.target.value }))}
                      placeholder="Escribe una respuesta"
                      value={commentDrafts[entry.id] ?? ''}
                    />
                    <button
                      aria-label="Enviar comentario"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-500 text-white hover:bg-brand-action-hover disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={sendingComments[entry.id] || !(commentDrafts[entry.id] ?? '').trim()}
                      onClick={() => sendComment(entry.id)}
                      type="button"
                    >
                      <Send aria-hidden="true" size={16} />
                    </button>
                  </div>
                </section>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
