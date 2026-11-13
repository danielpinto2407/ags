import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, LoaderCircle, Plus, Save, Send, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import DateField from '@/components/DateField';
import SelectModalField from '@/components/SelectModalField';
import { useCoachMembers } from '@/app/useCoachMembers';
import { useCoachRoutineAssignments } from '@/app/useCoachRoutineAssignments';
import { useExerciseLibrary } from '@/app/useExerciseLibrary';
import { formatMuscleName } from '@/domain/exerciseDefinition';
import type { ExerciseDefinition } from '@/domain/exerciseDefinition';
import type { Profile } from '@/domain/profile';
import { formatLocalDate, localDateInputValue } from '@/domain/localDate';
import type {
  RoutineAssignmentDayInput,
  RoutineAssignment,
  RoutineAssignmentItemInput,
  RoutineProgramMode,
  RoutineExerciseSnapshot,
} from '@/domain/routineAssignment';

interface CoachProgramRoutineProps {
  profile: Profile;
}

interface DraftItem extends RoutineAssignmentItemInput {
  exercise: RoutineExerciseSnapshot;
}

interface DraftDay extends Omit<RoutineAssignmentDayInput, 'items'> {
  items: DraftItem[];
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

function fromAssignmentDays(assignment: RoutineAssignment | undefined): DraftDay[] {
  return (assignment?.days ?? [{ id: 'new-day', position: 1, title: 'Rutina', items: [] }]).map((day) => ({
    position: day.position,
    title: day.title,
    items: day.items.map((item) => ({
      source: item.source,
      sourceId: item.sourceId,
      exercise: item.exercise,
      prescribedSets: item.prescribedSets,
      prescribedReps: item.prescribedReps,
      targetLoad: item.targetLoad,
      workDuration: item.workDuration,
      rest: item.rest,
      baseRepetitions: item.baseRepetitions,
      repetitionsIncrement: item.repetitionsIncrement,
      baseLoad: item.baseLoad,
      loadIncrement: item.loadIncrement,
      loadUnit: item.loadUnit,
    })),
  }));
}

export default function CoachProgramRoutine({ profile }: CoachProgramRoutineProps) {
  const tenantId = profile.tenant_id;
  const [selectedDate, setSelectedDate] = useState(localDateInputValue);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [programMode, setProgramMode] = useState<RoutineProgramMode>('SINGLE_DAY');
  const [additionalCycleRepeats, setAdditionalCycleRepeats] = useState(0);
  const [selectedDayPosition, setSelectedDayPosition] = useState(1);
  const [title, setTitle] = useState('Rutina personalizada');
  const [days, setDays] = useState<DraftDay[]>([{ position: 1, title: 'Rutina', items: [] }]);
  const [selectedExerciseKey, setSelectedExerciseKey] = useState('');
  const [prescribedSets, setPrescribedSets] = useState(3);
  const [prescribedReps, setPrescribedReps] = useState('10-12');
  const [baseRepetitionsDraft, setBaseRepetitionsDraft] = useState('10');
  const [targetLoad, setTargetLoad] = useState('');
  const [baseLoadDraft, setBaseLoadDraft] = useState('');
  const [repetitionsIncrementDraft, setRepetitionsIncrementDraft] = useState(0);
  const [loadIncrementDraft, setLoadIncrementDraft] = useState(0);
  const [loadUnitDraft, setLoadUnitDraft] = useState<'lbs' | 'kg'>('kg');
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
      && assignment.programMode === programMode
      && (programMode === 'CYCLE' || assignment.scheduledFor === selectedDate)
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
    setDays(fromAssignmentDays(selectedAssignment));
    setAdditionalCycleRepeats(selectedAssignment?.additionalCycleRepeats ?? 0);
    setSelectedDayPosition(1);
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
  const activeDay = days.find((day) => day.position === selectedDayPosition) ?? days[0];
  const items = activeDay?.items ?? [];
  const updateItems = (update: (current: DraftItem[]) => DraftItem[]) => {
    setDays((currentDays) => currentDays.map((day) => (
      day.position === selectedDayPosition ? { ...day, items: update(day.items) } : day
    )));
  };
  const setCycleDayCount = (count: number) => {
    const safeCount = Math.min(20, Math.max(1, count));
    setDays((current) => Array.from({ length: safeCount }, (_, index) => {
      const position = index + 1;
      return current.find((day) => day.position === position) ?? {
        position,
        title: `Día ${position}`,
        items: [],
      };
    }));
    setSelectedDayPosition((currentPosition) => Math.min(currentPosition, safeCount));
  };
  const updateDay = (position: number, update: (day: DraftDay) => DraftDay) => {
    setDays((current) => current.map((day) => (day.position === position ? update(day) : day)));
  };
  const selectedExercise = availableExercises.find(({ source, exercise }) => `${source}:${exercise.id}` === selectedExerciseKey);

  const addExercise = () => {
    if (!selectedExercise) return;
    updateItems((current) => [...current, {
      source: selectedExercise.source,
      sourceId: selectedExercise.exercise.id,
      exercise: snapshotExercise(selectedExercise.exercise),
      prescribedSets,
      prescribedReps: prescribedReps.trim(),
      targetLoad: targetLoad.trim(),
      workDuration: workDuration.trim() || null,
      rest: rest.trim(),
      baseRepetitions: programMode === 'CYCLE' ? Number(baseRepetitionsDraft) : null,
      repetitionsIncrement: programMode === 'CYCLE' ? repetitionsIncrementDraft : 0,
      baseLoad: programMode === 'CYCLE' && baseLoadDraft !== '' ? Number(baseLoadDraft) : null,
      loadIncrement: programMode === 'CYCLE' ? loadIncrementDraft : 0,
      loadUnit: programMode === 'CYCLE' && baseLoadDraft !== '' ? loadUnitDraft : null,
    }]);
    setSelectedExerciseKey('');
    setRepetitionsIncrementDraft(0);
    setLoadIncrementDraft(0);
    setBaseLoadDraft('');
    setActionError(null);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    updateItems((current) => {
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
    if ((programMode === 'SINGLE_DAY' && !selectedDate) || !title.trim()) {
      setActionError('La fecha de programación y el nombre son obligatorios.');
      return;
    }
    if (items.some((item) => !item.prescribedReps.trim() || item.prescribedSets < 1 || !item.rest.trim())) {
      setActionError('Cada ejercicio debe tener series, repeticiones y descanso válidos.');
      return;
    }
    if (programMode === 'CYCLE' && days.some((day) => day.items.some((item) => (
      !Number.isSafeInteger(item.baseRepetitions) || (item.baseRepetitions ?? 0) < 1
      || (item.baseLoad != null && (!Number.isSafeInteger(item.baseLoad) || item.baseLoad < 0))
      || !Number.isSafeInteger(item.repetitionsIncrement)
      || !Number.isSafeInteger(item.loadIncrement)
    )))) {
      setActionError('Cada ejercicio del ciclo necesita progresiones con valores enteros válidos.');
      return;
    }

    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      const assignmentId = await assignmentsQuery.saveTrainingProgramDraft({
        assignmentId: selectedAssignment?.id ?? null,
        studentId: selectedStudentId,
        programMode,
        scheduledFor: programMode === 'SINGLE_DAY' ? selectedDate : null,
        title,
        additionalCycleRepeats: programMode === 'CYCLE' ? additionalCycleRepeats : 0,
        days: (programMode === 'SINGLE_DAY' ? [activeDay] : days).map((day, index) => ({
          position: index + 1,
          title: day.title,
          items: day.items.map((item) => ({
            source: item.source,
            sourceId: item.sourceId,
            prescribedSets: item.prescribedSets,
            prescribedReps: item.prescribedReps,
            targetLoad: item.targetLoad,
            workDuration: item.workDuration,
            rest: item.rest,
            baseRepetitions: programMode === 'CYCLE' ? item.baseRepetitions : null,
            repetitionsIncrement: programMode === 'CYCLE' ? item.repetitionsIncrement : 0,
            baseLoad: programMode === 'CYCLE' ? item.baseLoad : null,
            loadIncrement: programMode === 'CYCLE' ? item.loadIncrement : 0,
            loadUnit: programMode === 'CYCLE' ? item.loadUnit : null,
          })),
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
      <Header title="Programar Rutina" subtitle="Asigna una fecha o crea un ciclo de entrenamiento" />

      {membersQuery.state.status === 'error' && <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{membersQuery.state.message}</p>}
      {library.state.status === 'error' && <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{library.state.message}</p>}
      {assignmentsQuery.state.status === 'error' && <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{assignmentsQuery.state.message}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Alumna
          <SelectModalField
            ariaLabel="Alumna de la rutina"
            className="mt-1.5"
            disabled={membersQuery.state.status !== 'loaded' || activeMembers.length === 0}
            modalTitle="Seleccionar alumna"
            onChange={setSelectedStudentId}
            options={activeMembers.map((member) => ({
              value: member.id,
              label: member.fullName,
              description: member.email ?? undefined,
            }))}
            placeholder={membersQuery.state.status === 'loading' ? 'Cargando alumnas…' : 'No hay alumnas activas'}
            value={selectedStudentId}
          />
        </label>
        <fieldset className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <legend>Modo de programación</legend>
          <div className="mt-1.5 grid grid-cols-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            {(['SINGLE_DAY', 'CYCLE'] as const).map((mode) => (
              <button
                aria-pressed={programMode === mode}
                className={`min-h-9 rounded-lg px-2 text-xs font-semibold normal-case ${programMode === mode ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'}`}
                key={mode}
                onClick={() => setProgramMode(mode)}
                type="button"
              >
                {mode === 'SINGLE_DAY' ? 'Una fecha' : 'Ciclo'}
              </button>
            ))}
          </div>
        </fieldset>
        {programMode === 'SINGLE_DAY' ? (
          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Fecha de programación
            <DateField ariaLabel="Fecha de programación" onChange={setSelectedDate} value={selectedDate} />
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Días del ciclo
              <input className={`${fieldClass} mt-1.5`} type="number" min="1" max="20" value={days.length} onChange={(event) => setCycleDayCount(Number(event.target.value) || 1)} />
            </label>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Ciclos adicionales
              <input className={`${fieldClass} mt-1.5`} type="number" min="0" max="20" value={additionalCycleRepeats} onChange={(event) => setAdditionalCycleRepeats(Math.min(20, Math.max(0, Number(event.target.value) || 0)))} />
            </label>
          </div>
        )}
      </div>

      {membersQuery.state.status === 'loaded' && activeMembers.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">No hay alumnas activas disponibles para programar.</div>
      )}

      {selectedStudentId && (
        <>
          {assignmentsQuery.state.status === 'loading' && (
            <p className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-500" role="status">
              <LoaderCircle className="animate-spin" size={15} /> Cargando programación…
            </p>
          )}

          {isPublished && (
            <p className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs text-emerald-300" role="status">
              Esta rutina está publicada y no se puede editar. Para cambiarla en esta fecha se definirá un flujo de revisión/versionado.
            </p>
          )}

          {programMode === 'CYCLE' && (
            <div className="space-y-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Nombre del ciclo
                <input className={`${fieldClass} mt-1.5`} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} disabled={!editable} />
              </label>
              <div aria-label="Día del ciclo" className="flex gap-2 overflow-x-auto pb-1" role="tablist">
                {days.map((day) => (
                  <button
                    aria-selected={selectedDayPosition === day.position}
                    className={`min-h-10 shrink-0 rounded-lg border px-3 text-xs font-semibold ${selectedDayPosition === day.position ? 'border-brand-600 bg-brand-950/40 text-brand-300' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}
                    key={day.position}
                    onClick={() => setSelectedDayPosition(day.position)}
                    role="tab"
                    type="button"
                  >
                    {day.position}. {day.title}
                  </button>
                ))}
              </div>
              {activeDay && (
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Nombre del día
                  <input className={`${fieldClass} mt-1.5`} maxLength={120} value={activeDay.title} onChange={(event) => updateDay(activeDay.position, (day) => ({ ...day, title: event.target.value }))} disabled={!editable} />
                </label>
              )}
            </div>
          )}

          {programMode === 'SINGLE_DAY' && (
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Nombre de la rutina
              <input className={`${fieldClass} mt-1.5`} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} disabled={!editable} />
            </label>
          )}

          <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {programMode === 'CYCLE' ? `Ejercicios · Día ${selectedDayPosition}` : `Ejercicios · ${formatLocalDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}`}
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
                          {programMode === 'CYCLE' && ` · +${item.repetitionsIncrement} reps / +${item.loadIncrement} ${item.loadUnit ?? 'kg'}`}
                          {item.workDuration ? ` · Trabajo ${item.workDuration}` : ''}
                        </p>
                        {programMode === 'CYCLE' && editable && (
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <label className="text-[9px] text-zinc-500">Reps base<input aria-label={`Repeticiones base de ${item.exercise.name}`} className={`${fieldClass} mt-1`} min="1" step="1" type="number" value={item.baseRepetitions ?? ''} onChange={(event) => updateItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, baseRepetitions: event.target.value === '' ? null : Number(event.target.value), prescribedReps: event.target.value } : entry))} /></label>
                            <label className="text-[9px] text-zinc-500">+ reps<input aria-label={`Incremento de repeticiones de ${item.exercise.name}`} className={`${fieldClass} mt-1`} min="0" step="1" type="number" value={item.repetitionsIncrement} onChange={(event) => updateItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, repetitionsIncrement: Number(event.target.value) || 0 } : entry))} /></label>
                            <label className="text-[9px] text-zinc-500">Carga base<input aria-label={`Carga base de ${item.exercise.name}`} className={`${fieldClass} mt-1`} min="0" step="1" type="number" value={item.baseLoad ?? ''} onChange={(event) => updateItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, baseLoad: event.target.value === '' ? null : Number(event.target.value), loadUnit: event.target.value === '' ? null : (entry.loadUnit ?? 'kg') } : entry))} /></label>
                            <label className="text-[9px] text-zinc-500">+ carga<input aria-label={`Incremento de carga de ${item.exercise.name}`} className={`${fieldClass} mt-1`} min="0" step="1" type="number" value={item.loadIncrement} disabled={item.baseLoad == null} onChange={(event) => updateItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, loadIncrement: Number(event.target.value) || 0 } : entry))} /></label>
                            <label className="text-[9px] text-zinc-500">Unidad<select aria-label={`Unidad de carga de ${item.exercise.name}`} className={`${fieldClass} mt-1`} value={item.loadUnit ?? 'kg'} disabled={item.baseLoad == null} onChange={(event) => updateItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, loadUnit: event.target.value as 'lbs' | 'kg' } : entry))}><option value="kg">kg</option><option value="lbs">lbs</option></select></label>
                          </div>
                        )}
                      </div>
                      {editable && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button aria-label={`Subir ${item.exercise.name}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-30" disabled={index === 0} onClick={() => moveItem(index, -1)} title="Subir" type="button"><ArrowUp size={13} /></button>
                          <button aria-label={`Bajar ${item.exercise.name}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-30" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)} title="Bajar" type="button"><ArrowDown size={13} /></button>
                          <button aria-label={`Quitar ${item.exercise.name}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 hover:bg-rose-950/40 hover:text-rose-300" onClick={() => updateItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} title="Quitar" type="button"><Trash2 size={13} /></button>
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
                  <SelectModalField
                    ariaLabel="Ejercicio para la rutina"
                    className="mt-1.5"
                    disabled={library.state.status !== 'loaded'}
                    modalTitle="Seleccionar ejercicio"
                    onChange={setSelectedExerciseKey}
                    options={availableExercises.map(({ source, exercise }) => ({
                      value: `${source}:${exercise.id}`,
                      label: exercise.name,
                      description: `${source === 'catalog' ? 'Catálogo general' : 'Mi gimnasio'} · ${exercise.primaryMuscles.join(', ')}`,
                    }))}
                    placeholder={library.state.status === 'loading' ? 'Cargando biblioteca…' : 'Selecciona del catálogo o del gimnasio'}
                    value={selectedExerciseKey}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <label className="text-[10px] text-zinc-500">Series<input className={`${fieldClass} mt-1`} type="number" min="1" max="50" value={prescribedSets} onChange={(event) => setPrescribedSets(Number(event.target.value))} /></label>
                  <label className="text-[10px] text-zinc-500">Repeticiones<input className={`${fieldClass} mt-1`} value={prescribedReps} onChange={(event) => setPrescribedReps(event.target.value)} /></label>
                  <label className="text-[10px] text-zinc-500">Carga objetivo<input className={`${fieldClass} mt-1`} value={targetLoad} onChange={(event) => setTargetLoad(event.target.value)} placeholder="Ej. 20 kg" /></label>
                  <label className="text-[10px] text-zinc-500">Trabajo<input className={`${fieldClass} mt-1`} value={workDuration} onChange={(event) => setWorkDuration(event.target.value)} placeholder="Opcional" /></label>
                  <label className="text-[10px] text-zinc-500">Descanso<input className={`${fieldClass} mt-1`} value={rest} onChange={(event) => setRest(event.target.value)} /></label>
                </div>
                {programMode === 'CYCLE' && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="text-[10px] text-zinc-500">Reps base<input className={`${fieldClass} mt-1`} min="1" step="1" type="number" value={baseRepetitionsDraft} onChange={(event) => setBaseRepetitionsDraft(event.target.value)} /></label>
                    <label className="text-[10px] text-zinc-500">Incremento reps<input className={`${fieldClass} mt-1`} min="0" step="1" type="number" value={repetitionsIncrementDraft} onChange={(event) => setRepetitionsIncrementDraft(Number(event.target.value) || 0)} /></label>
                    <label className="text-[10px] text-zinc-500">Carga base<input className={`${fieldClass} mt-1`} min="0" step="1" type="number" value={baseLoadDraft} onChange={(event) => setBaseLoadDraft(event.target.value)} placeholder="Sin carga" /></label>
                    <label className="text-[10px] text-zinc-500">Incremento carga<input className={`${fieldClass} mt-1`} min="0" step="1" type="number" value={loadIncrementDraft} disabled={baseLoadDraft === ''} onChange={(event) => setLoadIncrementDraft(Number(event.target.value) || 0)} /></label>
                    <label className="text-[10px] text-zinc-500">Unidad<select className={`${fieldClass} mt-1`} value={loadUnitDraft} disabled={baseLoadDraft === ''} onChange={(event) => setLoadUnitDraft(event.target.value as 'lbs' | 'kg')}><option value="kg">kg</option><option value="lbs">lbs</option></select></label>
                  </div>
                )}
                <button className="flex min-h-9 items-center gap-1.5 rounded-xl border border-brand-800 px-3 text-xs font-semibold text-brand-300 hover:bg-brand-950/40 disabled:cursor-not-allowed disabled:opacity-40" disabled={!selectedExercise || prescribedSets < 1 || !prescribedReps.trim() || !rest.trim() || (programMode === 'CYCLE' && (!Number.isSafeInteger(Number(baseRepetitionsDraft)) || Number(baseRepetitionsDraft) < 1 || (baseLoadDraft !== '' && !Number.isSafeInteger(Number(baseLoadDraft)))))} onClick={addExercise} type="button">
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
