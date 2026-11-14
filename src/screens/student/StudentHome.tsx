import { ChevronRight, Clock3, Dumbbell, LoaderCircle } from 'lucide-react';
import Header from '@/components/Header';
import { useStudentRoutineAssignment } from '@/app/useStudentRoutineAssignment';
import type { Screen } from '@/types';
import type { Profile } from '@/domain/profile';
import { formatLocalDate, utcDateInputValue } from '@/domain/localDate';

interface StudentHomeProps {
  onNavigate: (screen: Screen) => void;
  profile: Profile;
}

export default function StudentHome({ onNavigate, profile }: StudentHomeProps) {
  const today = utcDateInputValue();
  const { state, reload } = useStudentRoutineAssignment(profile.id, profile.tenant_id ?? '', today);
  const assignment = state.assignment;
  const previewDay = assignment?.days[0];
  const previewItems = previewDay?.items ?? [];

  return (
    <div className="space-y-5">
      <Header title={`Hola, ${profile.full_name}`} subtitle="Tu espacio personal" />

      {state.status === 'loading' && (
        <p className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-sm text-zinc-500" role="status">
          <LoaderCircle className="animate-spin" size={17} /> Cargando programación de hoy…
        </p>
      )}

      {state.status === 'error' && (
        <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-4" role="alert">
          <p className="text-sm text-rose-300">{state.message}</p>
          <button className="mt-2 text-xs font-semibold text-rose-200 underline underline-offset-2" onClick={reload} type="button">Reintentar</button>
        </div>
      )}

      {state.status === 'loaded' && (
        <section className="workout-card overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="workout-cover flex min-h-44 flex-col justify-end px-5 py-5 sm:min-h-52 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/85">{assignment?.programMode === 'CYCLE' ? `Ciclo · ${assignment.cycleDayCount} entrenamientos` : `Rutina asignada · ${formatLocalDate(assignment?.scheduledFor ?? today)}`}</p>
            <h2 className="mt-2 max-w-lg font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
              {assignment?.title ?? 'Un día para recuperar energía'}
            </h2>
            <p className="mt-2 text-xs text-white/85">{assignment?.programMode === 'CYCLE' ? 'Puedes elegir cualquiera de los días del ciclo.' : assignment ? 'Tu entrenamiento personalizado' : 'Tu coach puede asignarte una rutina cuando esté lista.'}</p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5"><Dumbbell size={14} className="text-brand-500" /> <strong className="text-zinc-900">{assignment?.programMode === 'CYCLE' ? assignment.cycleDayCount : previewItems.length}</strong> {assignment?.programMode === 'CYCLE' ? 'días disponibles' : 'ejercicios'}</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 size={14} className="text-brand-500" /> Entrena a tu ritmo</span>
            </div>
            {assignment?.programMode === 'CYCLE' ? (
              <div className="mt-4 rounded-lg bg-zinc-950 px-3 py-3 text-xs leading-relaxed text-zinc-400">
                Selecciona el entrenamiento que quieras realizar. El orden de los días es libre.
              </div>
            ) : assignment && assignment.items.length > 0 ? (
              <ul className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
                {previewItems.slice(0, 3).map((item, index) => (
                  <li key={item.id} className="flex min-h-12 items-center gap-3 py-2 text-xs">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-600">{String(index + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-zinc-900">{item.exercise.name}</span>
                    <span className="shrink-0 text-zinc-500">{item.prescribedSets} × {item.prescribedReps}</span>
                  </li>
                ))}
                {previewItems.length > 3 && <li className="py-2 text-[10px] text-zinc-500">Y {previewItems.length - 3} ejercicios más</li>}
              </ul>
            ) : (
              <div className="mt-4 rounded-lg bg-zinc-950 px-3 py-3 text-xs leading-relaxed text-zinc-600">
                Revisa tus rutinas o consulta con tu coach para ver tu próxima sesión.
              </div>
            )}
            <button
              onClick={() => onNavigate('routines')}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              type="button"
            >
              {assignment?.programMode === 'CYCLE' ? 'Elegir entrenamiento' : assignment ? 'Ver mi rutina' : 'Consultar mis rutinas'}
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
