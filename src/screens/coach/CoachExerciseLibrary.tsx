import { useMemo, useState } from 'react';
import { Archive, Check, Copy, Dumbbell, LoaderCircle, Pencil, Plus, RefreshCw, Search, Undo2 } from 'lucide-react';
import Header from '@/components/Header';
import CreateExerciseModal from '@/components/CreateExerciseModal';
import SelectModalField from '@/components/SelectModalField';
import { useExerciseLibrary } from '@/app/useExerciseLibrary';
import type { Profile } from '@/domain/profile';
import {
  EXERCISE_FOCUSES,
  exerciseDifficultyLabels,
  exerciseEquipmentLabels,
  exerciseFocusLabels,
  exerciseMovementLabels,
  formatMuscleName,
} from '@/domain/exerciseDefinition';
import type { ExerciseDefinition, ExerciseDefinitionDifficulty, ExerciseDefinitionInput, ExerciseFocus } from '@/domain/exerciseDefinition';

interface CoachExerciseLibraryProps {
  profile: Profile;
}

type LibrarySource = 'catalog' | 'gym';

const difficultyColors = {
  BEGINNER: 'border-emerald-800/50 bg-emerald-950/30 text-emerald-300',
  INTERMEDIATE: 'border-amber-800/50 bg-amber-950/30 text-amber-300',
  ADVANCED: 'border-brand-800/50 bg-brand-950/30 text-brand-300',
} as const;

export default function CoachExerciseLibrary({ profile }: CoachExerciseLibraryProps) {
  const tenantId = profile.tenant_id;
  const library = useExerciseLibrary(tenantId ?? '', profile.id);
  const [source, setSource] = useState<LibrarySource>('catalog');
  const [query, setQuery] = useState('');
  const [focusFilter, setFocusFilter] = useState<'ALL' | ExerciseFocus>('ALL');
  const [equipmentFilter, setEquipmentFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | ExerciseDefinitionDifficulty>('ALL');
  const [editorExercise, setEditorExercise] = useState<ExerciseDefinition | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [archivingExercise, setArchivingExercise] = useState<ExerciseDefinition | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const exercises = source === 'catalog' ? library.state.catalog : library.state.tenantExercises;
  const filteredExercises = useMemo(() => exercises.filter((exercise) => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const searchable = [
      exercise.name,
      ...exercise.primaryMuscles,
      ...exercise.secondaryMuscles,
      ...exercise.primaryMuscles.map(formatMuscleName),
      ...exercise.secondaryMuscles.map(formatMuscleName),
      ...exercise.equipment.map((item) => exerciseEquipmentLabels[item]),
    ].join(' ').toLocaleLowerCase();
    return searchable.includes(normalizedQuery)
      && (focusFilter === 'ALL' || exercise.focus === focusFilter)
        && (equipmentFilter === 'ALL' || exercise.equipment.includes(equipmentFilter as ExerciseDefinition['equipment'][number]))
        && (difficultyFilter === 'ALL' || exercise.difficulty === difficultyFilter);
      }), [difficultyFilter, equipmentFilter, exercises, focusFilter, query]);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setActionError(null);
    setNotice(null);
    try {
      await action();
      setNotice(successMessage);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo completar la acción.');
    }
  };

  const saveExercise = async (input: ExerciseDefinitionInput) => {
    if (!tenantId) throw new Error('Esta cuenta no está vinculada a un gimnasio activo.');
    if (editorExercise) {
      await library.update(editorExercise.id, input);
    } else {
      await library.create(input);
    }
  };

  const confirmArchive = async () => {
    if (!archivingExercise) return;
    await runAction(
      () => library.archive(archivingExercise.id, true),
      'Ejercicio archivado. Ya no estará disponible para nuevas programaciones.'
    );
    setArchivingExercise(null);
  };

  if (!tenantId) {
    return (
      <div className="space-y-4">
        <Header title="Biblioteca" subtitle="Acceso de gimnasio no disponible" />
        <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-4 text-sm text-rose-300" role="alert">
          Esta cuenta no tiene un gimnasio asociado para consultar la biblioteca.
        </p>
      </div>
    );
  }

  const loading = library.state.status === 'loading';
  const loadError = library.state.status === 'error' ? library.state.message : null;

  return (
    <div className="space-y-4">
      <Header
        title="Biblioteca"
        subtitle={loading ? 'Cargando ejercicios' : `${exercises.length} ${source === 'catalog' ? 'ejercicios generales' : 'ejercicios del gimnasio'}`}
      />

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-1">
        <button
          aria-pressed={source === 'catalog'}
          className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${source === 'catalog' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'}`}
          onClick={() => { setSource('catalog'); setNotice(null); setActionError(null); }}
          type="button"
        >
          Catálogo general
        </button>
        <button
          aria-pressed={source === 'gym'}
          className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${source === 'gym' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'}`}
          onClick={() => { setSource('gym'); setNotice(null); setActionError(null); }}
          type="button"
        >
          Mi gimnasio
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] leading-relaxed text-zinc-500">
          {source === 'catalog'
            ? 'Ejercicios compartidos para todos los gimnasios. Puedes copiarlos para personalizarlos.'
            : 'Ejercicios propios de tu gimnasio. Solo tu equipo de coach puede editarlos.'}
        </p>
        {source === 'gym' && (
          <label className="flex shrink-0 items-center gap-1.5 text-[10px] text-zinc-500">
            <input checked={library.includeArchived} onChange={(event) => library.setIncludeArchived(event.target.checked)} type="checkbox" className="accent-brand-500" />
            Archivados
          </label>
        )}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          type="search"
          placeholder="Buscar ejercicio, músculo o equipo..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 transition-colors focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Enfoque
          <SelectModalField
            ariaLabel="Filtrar por enfoque"
            className="mt-1.5"
            modalTitle="Filtrar por enfoque"
            onChange={(value) => setFocusFilter(value as 'ALL' | ExerciseFocus)}
            options={[{ value: 'ALL', label: 'Todos los enfoques' }, ...EXERCISE_FOCUSES.map((focus) => ({ value: focus, label: exerciseFocusLabels[focus] }))]}
            value={focusFilter}
          />
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Equipo
          <SelectModalField
            ariaLabel="Filtrar por equipo"
            className="mt-1.5"
            modalTitle="Filtrar por equipo"
            onChange={setEquipmentFilter}
            options={[{ value: 'ALL', label: 'Todos los equipos' }, ...Object.entries(exerciseEquipmentLabels).map(([value, label]) => ({ value, label }))]}
            value={equipmentFilter}
          />
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Dificultad
          <SelectModalField
            ariaLabel="Filtrar por dificultad"
            className="mt-1.5"
            modalTitle="Filtrar por dificultad"
            onChange={(value) => setDifficultyFilter(value as 'ALL' | ExerciseDefinitionDifficulty)}
            options={[{ value: 'ALL', label: 'Todos los niveles' }, ...Object.entries(exerciseDifficultyLabels).map(([value, label]) => ({ value, label }))]}
            value={difficultyFilter}
          />
        </label>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-900/60 bg-rose-950/20 p-3" role="alert">
          <p className="text-xs text-rose-300">{loadError}</p>
          <button aria-label="Reintentar carga" className="rounded-lg p-2 text-rose-300 hover:bg-rose-950/50" onClick={library.reload} type="button">
            <RefreshCw size={15} />
          </button>
        </div>
      )}
      {actionError && <p className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{actionError}</p>}
      {notice && <p className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs text-emerald-300" role="status">{notice}</p>}

      {loading && exercises.length === 0 && !loadError && (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500" role="status">
          <LoaderCircle className="animate-spin" size={17} /> Cargando biblioteca…
        </p>
      )}

      {!loading && !loadError && filteredExercises.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredExercises.map((exercise) => (
            <article key={exercise.id} className={`min-w-0 rounded-2xl border bg-zinc-900 p-4 ${exercise.archivedAt ? 'border-zinc-800/60 opacity-70' : 'border-zinc-800'}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-900/50 bg-brand-950/30 text-brand-300">
                  <Dumbbell size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-display text-sm font-bold leading-snug text-white">{exercise.name}</h2>
                  <p className="mt-1 text-[11px] text-zinc-400">{exercise.primaryMuscles.map(formatMuscleName).join(', ')}</p>
                  {exercise.secondaryMuscles.length > 0 && <p className="mt-0.5 text-[10px] text-zinc-600">También: {exercise.secondaryMuscles.map(formatMuscleName).join(', ')}</p>}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-[9px] text-zinc-300">{exerciseFocusLabels[exercise.focus]}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] ${difficultyColors[exercise.difficulty]}`}>{exerciseDifficultyLabels[exercise.difficulty]}</span>
                {exercise.equipment.map((item) => <span key={item} className="rounded-full border border-zinc-800 px-2 py-0.5 text-[9px] text-zinc-500">{exerciseEquipmentLabels[item]}</span>)}
              </div>
              <p className="mt-2 text-[10px] text-zinc-600">{exerciseMovementLabels[exercise.movementPattern]}</p>

              <details className="group mt-3 border-t border-zinc-800 pt-2.5">
                <summary className="cursor-pointer list-none text-[11px] font-medium text-brand-400 marker:hidden">Ver instrucciones</summary>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{exercise.instructions}</p>
                {exercise.tips && <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-amber-200/70">{exercise.tips}</p>}
                {exercise.videoUrl && <a className="mt-2 inline-block text-[11px] text-brand-300 underline decoration-brand-800 underline-offset-2" href={exercise.videoUrl} target="_blank" rel="noreferrer">Abrir video HTTPS</a>}
                {!exercise.videoUrl && <p className="mt-2 text-[10px] text-zinc-600">Sin video disponible</p>}
              </details>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className={`text-[9px] font-semibold uppercase tracking-wide ${exercise.archivedAt ? 'text-zinc-500' : source === 'catalog' ? 'text-sky-300' : 'text-brand-300'}`}>
                  {exercise.archivedAt ? 'Archivado' : source === 'catalog' ? 'Catálogo general' : exercise.sourceCatalogExerciseId ? 'Copia del catálogo' : 'Del gimnasio'}
                </span>
                {source === 'catalog' ? (
                  <button
                    className="flex min-h-8 items-center gap-1.5 rounded-lg border border-brand-800/70 px-2.5 text-[10px] font-semibold text-brand-300 transition-colors hover:bg-brand-950/40 disabled:opacity-50"
                    disabled={loading}
                    onClick={() => void runAction(() => library.copy(exercise), 'Copia creada en Mi gimnasio.')}
                    type="button"
                  >
                    <Copy size={12} /> Copiar al gimnasio
                  </button>
                ) : exercise.archivedAt ? (
                  <button className="flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-800" onClick={() => void runAction(() => library.archive(exercise.id, false), 'Ejercicio restaurado.')} type="button">
                    <Undo2 size={12} /> Restaurar
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button aria-label={`Editar ${exercise.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white" onClick={() => { setEditorExercise(exercise); setShowCreateModal(true); }} title="Editar" type="button">
                      <Pencil size={14} />
                    </button>
                    <button aria-label={`Archivar ${exercise.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-rose-950/40 hover:text-rose-300" onClick={() => setArchivingExercise(exercise)} title="Archivar" type="button">
                      <Archive size={14} />
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !loadError && filteredExercises.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center">
          <Dumbbell className="mx-auto mb-2 text-zinc-600" size={25} />
          <p className="text-sm font-semibold text-zinc-300">{query || focusFilter !== 'ALL' || equipmentFilter !== 'ALL' || difficultyFilter !== 'ALL' ? 'No hay resultados' : source === 'catalog' ? 'El catálogo está vacío' : 'Aún no hay ejercicios del gimnasio'}</p>
          <p className="mt-1 text-xs text-zinc-600">{source === 'gym' && !query ? 'Crea un ejercicio o copia uno del catálogo general.' : 'Prueba otros filtros o términos de búsqueda.'}</p>
        </div>
      )}

      {source === 'gym' && (
        <button
          onClick={() => { setEditorExercise(null); setShowCreateModal(true); }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-800 p-3.5 text-sm font-semibold text-zinc-500 transition-colors hover:border-brand-800 hover:text-brand-400"
          type="button"
        >
          <Plus size={16} /> Crear ejercicio para mi gimnasio
        </button>
      )}

      {showCreateModal && (
        <CreateExerciseModal
          exercise={editorExercise ?? undefined}
          onClose={() => { setShowCreateModal(false); setEditorExercise(null); }}
          onSave={saveExercise}
        />
      )}

      {archivingExercise && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm" role="presentation">
          <section aria-labelledby="archive-title" aria-modal="true" className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl" role="dialog">
            <h2 id="archive-title" className="font-display text-sm font-bold text-white">¿Archivar ejercicio?</h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">{archivingExercise.name} dejará de aparecer para nuevas programaciones. Podrás restaurarlo después.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-xl px-3 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900" onClick={() => setArchivingExercise(null)} type="button">Cancelar</button>
              <button className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500" onClick={() => void confirmArchive()} type="button">
                <Check size={13} /> Archivar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
