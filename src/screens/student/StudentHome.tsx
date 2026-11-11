import { CalendarDays, ChevronRight, Dumbbell, LoaderCircle } from 'lucide-react';
import Header from '@/components/Header';
import { useStudentRoutineAssignment } from '@/app/useStudentRoutineAssignment';
import type { Screen } from '@/types';
import type { Profile } from '@/domain/profile';
import { formatLocalDate, localDateInputValue } from '@/domain/localDate';

interface StudentHomeProps {
  onNavigate: (screen: Screen) => void;
  profile: Profile;
}

export default function StudentHome({ onNavigate, profile }: StudentHomeProps) {
  const today = localDateInputValue();
  const { state, reload } = useStudentRoutineAssignment(profile.id, profile.tenant_id ?? '', today);
  const assignment = state.assignment;

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
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-900/50 bg-brand-950/30 text-brand-300">
              {assignment ? <Dumbbell size={19} /> : <CalendarDays size={19} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">Rutina de hoy</p>
              {assignment ? (
                <>
                  <h2 className="mt-1 text-lg font-bold text-white">{assignment.title}</h2>
                  <p className="mt-1 text-xs text-zinc-500">{formatLocalDate(assignment.scheduledFor)} · {assignment.items.length} ejercicios</p>
                </>
              ) : (
                <>
                  <h2 className="mt-1 text-base font-semibold text-zinc-200">Aún no tienes programación para hoy</h2>
                  <p className="mt-1 text-xs text-zinc-500">Tu coach puede asignarte una rutina para {formatLocalDate(today)}.</p>
                </>
              )}
            </div>
          </div>

          {assignment && assignment.items.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
              {assignment.items.slice(0, 3).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-zinc-300">{item.exercise.name}</span>
                  <span className="shrink-0 text-zinc-500">{item.prescribedSets} × {item.prescribedReps}</span>
                </li>
              ))}
              {assignment.items.length > 3 && <li className="text-[10px] text-zinc-600">y {assignment.items.length - 3} ejercicios más</li>}
            </ul>
          )}

          <button
            onClick={() => onNavigate('routines')}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white transition-colors hover:bg-brand-500"
            type="button"
          >
            {assignment ? 'Ver rutina' : 'Consultar mis rutinas'}
            <ChevronRight size={16} />
          </button>
        </section>
      )}
    </div>
  );
}
