import { useState } from 'react';
import { CalendarDays, Dumbbell, LoaderCircle } from 'lucide-react';
import Header from '@/components/Header';
import DateField from '@/components/DateField';
import ExerciseVideoPreview from '@/components/ExerciseVideoPreview';
import { useStudentRoutineAssignment } from '@/app/useStudentRoutineAssignment';
import type { Profile } from '@/domain/profile';
import { exerciseEquipmentLabels, exerciseFocusLabels, exerciseMovementLabels, formatMuscleName } from '@/domain/exerciseDefinition';
import { formatLocalDate, localDateInputValue } from '@/domain/localDate';

interface StudentRoutinesProps {
  profile: Profile;
}

export default function StudentRoutines({ profile }: StudentRoutinesProps) {
  const [selectedDate, setSelectedDate] = useState(localDateInputValue);
  const tenantId = profile.tenant_id ?? '';
  const { state, reload } = useStudentRoutineAssignment(profile.id, tenantId, selectedDate);
  const assignment = state.assignment;

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
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-900/50 bg-brand-950/30 text-brand-300">
                <CalendarDays size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">Programación publicada</p>
                <h2 className="mt-1 font-display text-base font-bold text-white">{assignment.title}</h2>
                <p className="mt-1 text-xs text-zinc-500">{formatLocalDate(assignment.scheduledFor)}</p>
              </div>
            </div>
          </section>

          {assignment.items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 p-5 text-center text-sm text-zinc-500">Esta rutina aún no tiene ejercicios.</p>
          ) : (
            <section className="space-y-2.5">
              <div className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <Dumbbell size={13} /> {assignment.items.length} ejercicios
              </div>
              {assignment.items.map((item, index) => (
                <article key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white">{index + 1}. {item.exercise.name}</h3>
                      <p className="mt-1 text-[11px] text-zinc-400">{item.exercise.primaryMuscles.map(formatMuscleName).join(', ')}</p>
                      <p className="mt-1.5 text-xs font-medium text-brand-300">
                        {item.prescribedSets} × {item.prescribedReps}
                        {item.targetLoad ? ` · ${item.targetLoad}` : ''}
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
                </article>
              ))}
            </section>
          )}
          <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-500">
            El registro de ejercicios completados estará disponible cuando se active el seguimiento de entrenamiento.
          </p>
        </>
      )}
    </div>
  );
}
