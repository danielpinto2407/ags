import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { X, Check, Dumbbell } from 'lucide-react';
import SelectModalField from '@/components/SelectModalField';
import {
  EXERCISE_DIFFICULTIES,
  EXERCISE_EQUIPMENT,
  EXERCISE_FOCUSES,
  EXERCISE_MOVEMENT_PATTERNS,
  exerciseDifficultyLabels,
  exerciseEquipmentLabels,
  exerciseFocusLabels,
  exerciseMovementLabels,
  toExerciseDefinitionInput,
} from '@/domain/exerciseDefinition';
import type {
  ExerciseDefinition,
  ExerciseDefinitionDifficulty,
  ExerciseDefinitionInput,
  ExerciseEquipment,
  ExerciseFocus,
  ExerciseMovementPattern,
} from '@/domain/exerciseDefinition';

interface CreateExerciseModalProps {
  onClose: () => void;
  onSave: (exercise: ExerciseDefinitionInput) => Promise<void>;
  exercise?: ExerciseDefinition;
}

const DEFAULT_EXERCISE: ExerciseDefinitionInput = {
  name: '',
  focus: 'GLUTES',
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: [],
  movementPattern: 'HIP_THRUST',
  difficulty: 'INTERMEDIATE',
  instructions: '',
  tips: '',
  videoUrl: null,
};

const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200 placeholder-zinc-600 transition-colors focus:border-brand-500 focus:outline-none';

export default function CreateExerciseModal({ onClose, onSave, exercise }: CreateExerciseModalProps) {
  const [form, setForm] = useState<ExerciseDefinitionInput>(() => (
    exercise ? toExerciseDefinitionInput(exercise) : DEFAULT_EXERCISE
  ));
  const [primaryMuscles, setPrimaryMuscles] = useState(form.primaryMuscles.join(', '));
  const [secondaryMuscles, setSecondaryMuscles] = useState(form.secondaryMuscles.join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')?.focus();
    return () => previousFocus?.focus();
  }, []);

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape' && !saving) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };

  const update = <K extends keyof ExerciseDefinitionInput>(key: K, value: ExerciseDefinitionInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleEquipment = (equipment: ExerciseEquipment) => {
    setForm((current) => ({
      ...current,
      equipment: current.equipment.includes(equipment)
        ? current.equipment.filter((item) => item !== equipment)
        : [...current.equipment, equipment],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const muscles = primaryMuscles.split(',').map((muscle) => muscle.trim()).filter(Boolean);
    const secondary = secondaryMuscles.split(',').map((muscle) => muscle.trim()).filter(Boolean);
    const videoUrl = form.videoUrl?.trim() || null;

    if (!form.name.trim() || muscles.length === 0 || !form.instructions.trim() || form.equipment.length === 0) {
      setError('Completa el nombre, músculo principal, equipo e instrucciones.');
      return;
    }
    if (videoUrl) {
      try {
        if (new URL(videoUrl).protocol !== 'https:') throw new Error('invalid protocol');
      } catch {
        setError('El enlace de video debe ser una URL HTTPS válida.');
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        primaryMuscles: muscles,
        secondaryMuscles: secondary,
        instructions: form.instructions.trim(),
        tips: form.tips.trim(),
        videoUrl,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el ejercicio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in" role="presentation">
      <form aria-labelledby="exercise-modal-title" aria-modal="true" onKeyDown={handleDialogKeyDown} onSubmit={(event) => void handleSubmit(event)} className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] border border-zinc-800 bg-zinc-900 p-5 animate-slide-up no-scrollbar sm:mb-6 sm:rounded-2xl" ref={dialogRef} role="dialog">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 flex items-center justify-center">
              <Dumbbell size={18} className="text-brand-400" />
            </div>
            <h3 className="font-display font-bold text-lg text-white" id="exercise-modal-title">{exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h3>
          </div>
          <button
            aria-label="Cerrar formulario de ejercicio"
            onClick={onClose}
            type="button"
            className="text-zinc-400 hover:text-white bg-zinc-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
            Nombre <span className="text-brand-500">*</span>
          </label>
          <input
            type="text"
            maxLength={120}
            required
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Ej: Hip Thrust con Barra"
            className={fieldClass}
          />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Enfoque
            <SelectModalField
              ariaLabel="Enfoque del ejercicio"
              className="mt-1.5"
              modalTitle="Enfoque del ejercicio"
              onChange={(value) => update('focus', value as ExerciseFocus)}
              options={EXERCISE_FOCUSES.map((focus) => ({ value: focus, label: exerciseFocusLabels[focus] }))}
              value={form.focus}
            />
          </label>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Patrón de movimiento
            <SelectModalField
              ariaLabel="Patrón de movimiento"
              className="mt-1.5"
              modalTitle="Patrón de movimiento"
              onChange={(value) => update('movementPattern', value as ExerciseMovementPattern)}
              options={EXERCISE_MOVEMENT_PATTERNS.map((pattern) => ({ value: pattern, label: exerciseMovementLabels[pattern] }))}
              value={form.movementPattern}
            />
          </label>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Músculos principales <span className="text-brand-400">*</span>
            <input className={`${fieldClass} mt-1.5 normal-case`} value={primaryMuscles} onChange={(event) => setPrimaryMuscles(event.target.value)} placeholder="Glúteo mayor, isquiotibiales" />
            <span className="mt-1 block text-[10px] normal-case text-zinc-600">Separa cada músculo con coma.</span>
          </label>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Músculos secundarios
            <input className={`${fieldClass} mt-1.5 normal-case`} value={secondaryMuscles} onChange={(event) => setSecondaryMuscles(event.target.value)} placeholder="Core, cuádriceps" />
            <span className="mt-1 block text-[10px] normal-case text-zinc-600">Separa cada músculo con coma.</span>
          </label>
        </div>

        <fieldset className="mb-4">
          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Equipo <span className="text-brand-400">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {EXERCISE_EQUIPMENT.map((equipment) => (
              <label key={equipment} className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs transition-colors ${form.equipment.includes(equipment) ? 'border-brand-700 bg-brand-950/40 text-brand-200' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}>
                <input
                  checked={form.equipment.includes(equipment)}
                  className="accent-brand-500"
                  onChange={() => toggleEquipment(equipment)}
                  type="checkbox"
                />
                {exerciseEquipmentLabels[equipment]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Dificultad</p>
          <div className="grid grid-cols-3 gap-2">
            {EXERCISE_DIFFICULTIES.map((difficulty: ExerciseDefinitionDifficulty) => (
              <button
                key={difficulty}
                aria-pressed={form.difficulty === difficulty}
                className={`rounded-xl border py-2.5 text-xs font-semibold transition-colors ${form.difficulty === difficulty ? 'border-brand-700 bg-brand-950/40 text-brand-200' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'}`}
                onClick={() => update('difficulty', difficulty)}
                type="button"
              >
                {exerciseDifficultyLabels[difficulty]}
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-4">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
            Descripción / Instrucciones
          </label>
          <textarea
            required
            value={form.instructions}
            onChange={(event) => update('instructions', event.target.value)}
            placeholder="Describe cómo se ejecuta el ejercicio paso a paso..."
            rows={3}
            className={`${fieldClass} resize-none`}
          />
        </div>

        {/* Tips */}
        <div className="mb-5">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
            Sugerencias / Puntos a cuidar
          </label>
          <textarea
            value={form.tips}
            onChange={(event) => update('tips', event.target.value)}
            placeholder="Ej: No arques la espalda baja. Mantén el core activado..."
            rows={3}
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div className="mb-5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Video HTTPS <span className="font-normal normal-case text-zinc-600">(opcional)</span>
            <input className={`${fieldClass} mt-1.5 normal-case`} type="url" value={form.videoUrl ?? ''} onChange={(event) => update('videoUrl', event.target.value || null)} placeholder="https://..." />
          </label>
        </div>

        {error && <p className="mb-4 rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            type="button"
            className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            disabled={saving}
            type="submit"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-500 disabled:cursor-wait disabled:opacity-60"
          >
            <Check size={16} />
            {saving ? 'Guardando…' : exercise ? 'Guardar cambios' : 'Crear ejercicio'}
          </button>
        </div>
      </form>
    </div>
  );
}
