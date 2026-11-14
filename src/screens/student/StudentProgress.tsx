import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, ChartNoAxesColumnIncreasing, LoaderCircle } from 'lucide-react';
import Header from '@/components/Header';
import { routineAssignmentRepository } from '@/data/routineAssignmentRepository';
import type { StudentRoutineHistoryEntry } from '@/domain/workoutExecution';
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

  return (
    <div className="space-y-4">
      <Header title="Mi Progreso" subtitle="Historial de entrenamientos" showBell={false} />

      {state.status === 'loading' && (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500" role="status">
          <LoaderCircle className="animate-spin" size={17} /> Cargando tu historial…
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
            Cuando marques tu primer ejercicio como completado, tus sesiones aparecerán aquí.
          </p>
          <button className="mx-auto mt-4 flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-xs font-bold text-white hover:bg-brand-500" onClick={() => onNavigate('routines')} type="button">
            Ir a mis rutinas <ArrowRight aria-hidden="true" size={14} />
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
                    {entry.cycleDayTitle && <p className="mt-0.5 text-xs text-zinc-400">{entry.cycleDayTitle} · Intento {entry.slotAttempt}</p>}
                  </div>
                  <span className="shrink-0 rounded-full border border-zinc-700 px-2 py-1 text-[9px] font-semibold text-zinc-300">
                    {executionStatusLabels[entry.status]}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-zinc-400">{entry.completedExercises} de {entry.prescribedExercises} {entry.prescribedExercises === 1 ? 'ejercicio' : 'ejercicios'}</span>
                    <span className="font-semibold text-brand-300">{Math.round(entry.progressPercent)}%</span>
                  </div>
                  <div aria-label={`${Math.round(entry.progressPercent)}% completado`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.round(entry.progressPercent)} className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800" role="progressbar">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${entry.progressPercent}%` }} />
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
