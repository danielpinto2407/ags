import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, LoaderCircle, Plus, Save, Send, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import { useCoachMembers } from '@/app/useCoachMembers';
import { useCoachRoutineAssignments } from '@/app/useCoachRoutineAssignments';
import { useExerciseLibrary } from '@/app/useExerciseLibrary';
import { formatMuscleName } from '@/domain/exerciseDefinition';
import type { ExerciseDefinition } from '@/domain/exerciseDefinition';
import type { Profile } from '@/domain/profile';
import { formatLocalDate, localDateInputValue } from '@/domain/localDate';
import type {
  RoutineAssignment,
  RoutineAssignmentItemInput,
  RoutineExerciseSnapshot,
} from '@/domain/routineAssignment';

interface CoachProgramRoutineProps {
  profile: Profile;
}

interface DraftItem extends RoutineAssignmentItemInput {
  exercise: RoutineExerciseSnapshot;
}

const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 focus:border-brand-500 focus:outline-none disabled:opacity-60';

function snapshotExercise(exercise: ExerciseDefinition): RoutineExerciseSnapshot {
  return {
    id: exercise.id,
    name: exercise.name,
    focus: exercise.focus,
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
    equipment: [...exercise.equipment],
    movementPattern: exercise.movementPattern,
    difficulty: exercise.difficulty,
    instructions: exercise.instructions,
    tips: exercise.tips,
    videoUrl: exercise.videoUrl,
  };
}

function fromAssignment(assignment: RoutineAssignment | undefined): DraftItem[] {
  return (assignment?.items ?? []).map((item) => ({
    source: item.source,
    sourceId: item.sourceId,
    exercise: item.exercise,
    prescribedSets: item.prescribedSets,
    prescribedReps: item.prescribedReps,
    targetLoad: item.targetLoad,
    workDuration: item.workDuration,
    rest: item.rest,
  }));
}

export default function CoachProgramRoutine({ profile }: CoachProgramRoutineProps) {
  const tenantId = profile.tenant_id;
  const [selectedDate, setSelectedDate] = useState(localDateInputValue);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [title, setTitle] = useState('Rutina personalizada');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [selectedExerciseKey, setSelectedExerciseKey] = useState('');
  const [prescribedSets, setPrescribedSets] = useState(3);
  const [prescribedReps, setPrescribedReps] = useState('10-12');
  const [targetLoad, setTargetLoad] = useState('');
  const [workDuration, setWorkDuration] = useState('');
  const [rest, setRest] = useState('60 s');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const membersQuery = useCoachMembers(profile.id);
  const library = useExerciseLibrary(tenantId ?? '', profile.id);
  const assignmentsQuery = useCoachRoutineAssignments(tenantId ?? '', profile.id, selectedDate);
  const activeMembers = membersQuery.state.members.filter((member) => member.status === 'ACTIVE');
  const selectedAssignment = assignmentsQuery.state.assignments.find(
    (assignment) => assignment.studentId === selectedStudentId
  );
  const isPublished = selectedAssignment?.status === 'PUBLISHED';
  const availableExercises = useMemo(() => [
    ...library.state.catalog.map((exercise) => ({ source: 'catalog' as const, exercise })),
    ...library.state.tenantExercises.map((exercise) => ({ source: 'tenant' as const, exercise })),
  ], [library.state]);

  useEffect(() => {
    if (!selectedStudentId && activeMembers.length > 0) setSelectedStudentId(activeMembers[0].id);
  }, [activeMembers, selectedStudentId]);

  useEffect(() => {
    if (assignmentsQuery.state.status !== 'loaded') return;
    setTitle(selectedAssignment?.title ?? 'Rutina personalizada');
    setItems(fromAssignment(selectedAssignment));
    setActionError(null);
  }, [assignmentsQuery.state.status, selectedAssignment]);

  if (!tenantId) {
    return (
      <div className="space-y-4">
        <Header title="Programar Rutina" subtitle="Acceso de gimnasio no disponible" />
        <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-4 text-sm text-rose-300" role="alert">
          Esta cuenta no tiene un gimnasio asociado.
        </p>
      </div>
    );
  }

  const editable = !isPublished && !saving;
  const selectedExercise = availableExercises.find(({ source, exercise }) => `${source}:${exercise.id}` === selectedExerciseKey);

  const addExercise = () => {
    if (!selectedExercise) return;
    setItems((current) => [...current, {
      source: selectedExercise.source,
      sourceId: selectedExercise.exercise.id,
      exercise: snapshotExercise(selectedExercise.exercise),
      prescribedSets,
      prescribedReps: prescribedReps.trim(),
      targetLoad: targetLoad.trim(),
      workDuration: workDuration.trim() || null,
      rest: rest.trim(),
    }]);
    setSelectedExerciseKey('');
    setActionError(null);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    setItems((current) => {
      const reordered = [...current];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered;
    });
  };

  const saveDraft = async (publishAfterSave: boolean) => {
    if (assignmentsQuery.state.status !== 'loaded') {
      setActionError('Espera a que termine de cargar la programación de esta fecha antes de guardar.');
      return;
    }
    if (!selectedStudentId) {
      setActionError('Selecciona una alumna activa para continuar.');
      return;
    }
    if (isPublished) return;
    if (!selectedDate || !title.trim()) {
      setActionError('La fecha y el nombre de la rutina son obligatorios.');
      return;
    }
    if (items.some((item) => !item.prescribedReps.trim() || item.prescribedSets < 1 || !item.rest.trim())) {
      setActionError('Cada ejercicio debe tener series, repeticiones y descanso válidos.');
      return;
    }

    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      const assignmentId = await assignmentsQuery.saveDraft({
        assignmentId: selectedAssignment?.id ?? null,
        studentId: selectedStudentId,
        scheduledFor: selectedDate,
        title,
        items: items.map((item) => ({
          source: item.source,
          sourceId: item.sourceId,
          prescribedSets: item.prescribedSets,
          prescribedReps: item.prescribedReps,
          targetLoad: item.targetLoad,
          workDuration: item.workDuration,
          rest: item.rest,
        })),
      });
      if (publishAfterSave) {
        await assignmentsQuery.publish(assignmentId);
        setNotice('Rutina publicada. La alumna ya puede verla.');
      } else {
        setNotice('Borrador guardado.');
      }
      assignmentsQuery.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo guardar la rutina.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Header title="Programar Rutina" subtitle="Asigna ejercicios a una alumna y fecha" />

      {membersQuery.state.status === 'error' && <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{membersQuery.state.message}</p>}
      {library.state.status === 'error' && <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{library.state.message}</p>}
      {assignmentsQuery.state.status === 'error' && <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{assignmentsQuery.state.message}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Alumna
          <select
            className={`${fieldClass} mt-1.5 normal-case`}
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
            disabled={membersQuery.state.status !== 'loaded' || activeMembers.length === 0}
          >
            {activeMembers.length === 0 && <option value="">No hay alumnas activas</option>}
            {activeMembers.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Fecha de programación
          <input className={`${fieldClass} mt-1.5`} type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>
      </div>

      {membersQuery.state.status === 'loaded' && activeMembers.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">No hay alumnas activas disponibles para programar.</div>
      )}

      {selectedStudentId && (
        <>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Nombre de la rutina
            <input className={`${fieldClass} mt-1.5`} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} disabled={!editable} />
          </label>

          {assignmentsQuery.state.status === 'loading' && (
            <p className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-500" role="status">
              <LoaderCircle className="animate-spin" size={15} /> Cargando programación de {formatLocalDate(selectedDate)}…
            </p>
          )}

          {isPublished && (
            <p className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs text-emerald-300" role="status">
              Esta rutina está publicada y no se puede editar. Para cambiarla en esta fecha se definirá un flujo de revisión/versionado.
            </p>
          )}

          <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Ejercicios · {formatLocalDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <span className="text-[10px] text-zinc-600">{items.length} en la rutina</span>
            </div>

            {items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">Aún no agregas ejercicios a esta rutina.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <article key={`${item.source}:${item.sourceId}:${index}`} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-zinc-100">{index + 1}. {item.exercise.name}</h3>
                        <p className="mt-0.5 text-[10px] text-zinc-500">{item.exercise.primaryMuscles.map(formatMuscleName).join(', ')}</p>
                        <p className="mt-1 text-[11px] text-zinc-400">
                          {item.prescribedSets} × {item.prescribedReps} · {item.targetLoad || 'Carga por definir'} · Descanso {item.rest}
                          {item.workDuration ? ` · Trabajo ${item.workDuration}` : ''}
                        </p>
                      </div>
                      {editable && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button aria-label={`Subir ${item.exercise.name}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-30" disabled={index === 0} onClick={() => moveItem(index, -1)} title="Subir" type="button"><ArrowUp size={13} /></button>
                          <button aria-label={`Bajar ${item.exercise.name}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-30" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)} title="Bajar" type="button"><ArrowDown size={13} /></button>
                          <button aria-label={`Quitar ${item.exercise.name}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 hover:bg-rose-950/40 hover:text-rose-300" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} title="Quitar" type="button"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {editable && (
              <div className="space-y-3 border-t border-zinc-800 pt-3">
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Añadir ejercicio
                  <select className={`${fieldClass} mt-1.5 normal-case`} value={selectedExerciseKey} onChange={(event) => setSelectedExerciseKey(event.target.value)} disabled={library.state.status !== 'loaded'}>
                    <option value="">Selecciona del catálogo o del gimnasio</option>
                    {library.state.status === 'loaded' && (
                      <>
                        <optgroup label="Catálogo general">
                          {library.state.catalog.map((exercise) => <option key={exercise.id} value={`catalog:${exercise.id}`}>{exercise.name}</option>)}
                        </optgroup>
                        <optgroup label="Mi gimnasio">
                          {library.state.tenantExercises.map((exercise) => <option key={exercise.id} value={`tenant:${exercise.id}`}>{exercise.name}</option>)}
                        </optgroup>
                      </>
                    )}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <label className="text-[10px] text-zinc-500">Series<input className={`${fieldClass} mt-1`} type="number" min="1" max="50" value={prescribedSets} onChange={(event) => setPrescribedSets(Number(event.target.value))} /></label>
                  <label className="text-[10px] text-zinc-500">Repeticiones<input className={`${fieldClass} mt-1`} value={prescribedReps} onChange={(event) => setPrescribedReps(event.target.value)} /></label>
                  <label className="text-[10px] text-zinc-500">Carga objetivo<input className={`${fieldClass} mt-1`} value={targetLoad} onChange={(event) => setTargetLoad(event.target.value)} placeholder="Ej. 20 kg" /></label>
                  <label className="text-[10px] text-zinc-500">Trabajo<input className={`${fieldClass} mt-1`} value={workDuration} onChange={(event) => setWorkDuration(event.target.value)} placeholder="Opcional" /></label>
                  <label className="text-[10px] text-zinc-500">Descanso<input className={`${fieldClass} mt-1`} value={rest} onChange={(event) => setRest(event.target.value)} /></label>
                </div>
                <button className="flex min-h-9 items-center gap-1.5 rounded-xl border border-brand-800 px-3 text-xs font-semibold text-brand-300 hover:bg-brand-950/40 disabled:cursor-not-allowed disabled:opacity-40" disabled={!selectedExercise || prescribedSets < 1 || !prescribedReps.trim() || !rest.trim()} onClick={addExercise} type="button">
                  <Plus size={14} /> Agregar a la rutina
                </button>
              </div>
            )}
          </section>

          {actionError && <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{actionError}</p>}
          {notice && <p className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs text-emerald-300" role="status">{notice}</p>}

          {!isPublished && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-50"
                disabled={saving || assignmentsQuery.state.status !== 'loaded'}
                onClick={() => void saveDraft(false)}
                type="button"
              >
                {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar borrador
              </button>
              <button
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white hover:bg-brand-500 disabled:cursor-wait disabled:opacity-50"
                disabled={saving || assignmentsQuery.state.status !== 'loaded' || items.length === 0}
                onClick={() => void saveDraft(true)}
                type="button"
              >
                {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                Guardar y publicar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
