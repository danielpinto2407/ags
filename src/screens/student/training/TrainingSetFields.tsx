import type { ActualSetPerformance } from '@/domain/workoutExecution';

interface TrainingSetFieldsProps {
  exerciseName: string;
  set: ActualSetPerformance;
  terminalLocked: boolean;
  controlsDisabled: boolean;
  onUpdate: (update: (current: ActualSetPerformance) => ActualSetPerformance) => void;
}

export default function TrainingSetFields({ exerciseName, set, terminalLocked, controlsDisabled, onUpdate }: TrainingSetFieldsProps) {
  return (
    <fieldset className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <legend className="px-1 text-xs font-bold text-zinc-200">Serie {set.setNumber}</legend>
      <div className="grid grid-cols-[auto_minmax(4rem,0.7fr)_minmax(0,1.3fr)] items-end gap-2">
        <label className="flex min-h-11 items-center gap-2 pr-1 text-[11px] text-zinc-300">
          <input
            aria-label={`Serie ${set.setNumber} realizada: ${exerciseName}`}
            checked={set.completed}
            className="h-5 w-5 accent-brand-500"
            disabled={controlsDisabled || terminalLocked}
            onChange={(event) => onUpdate((current) => ({ ...current, completed: event.target.checked }))}
            type="checkbox"
          />
          Hecha
        </label>
        <label className="text-[10px] font-medium text-zinc-400">
          Rep.
          <input
            aria-label={`Repeticiones de la serie ${set.setNumber}: ${exerciseName}`}
            className="mt-1 min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-sm text-white"
            disabled={controlsDisabled}
            min="0"
            step="1"
            type="number"
            value={set.actualRepetitions ?? ''}
            onChange={(event) => onUpdate((current) => ({ ...current, actualRepetitions: event.target.value === '' ? null : Number(event.target.value) }))}
          />
        </label>
        <label className="text-[10px] font-medium text-zinc-400">
          Carga
          <span className="mt-1 flex gap-1">
            <input
              aria-label={`Carga de la serie ${set.setNumber}: ${exerciseName}`}
              className="min-h-11 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-sm text-white"
              disabled={controlsDisabled}
              min="0"
              step="1"
              type="number"
              value={set.actualLoad ?? ''}
              onChange={(event) => onUpdate((current) => ({
                ...current,
                actualLoad: event.target.value === '' ? null : Number(event.target.value),
                loadUnit: event.target.value === '' ? null : (current.loadUnit ?? 'kg'),
              }))}
            />
            <select
              aria-label={`Unidad de carga de la serie ${set.setNumber}: ${exerciseName}`}
              className="min-h-11 rounded-md border border-zinc-700 bg-zinc-900 px-1.5 text-xs text-zinc-200"
              disabled={controlsDisabled || set.actualLoad === null}
              value={set.loadUnit ?? 'kg'}
              onChange={(event) => onUpdate((current) => ({ ...current, loadUnit: event.target.value as 'kg' | 'lbs' }))}
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </span>
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-[11px] text-zinc-300">
          <span className="flex justify-between gap-2"><span>RIR</span><span>{set.rir ?? '—'}</span></span>
          <input
            aria-label={`RIR serie ${set.setNumber}: ${exerciseName}`}
            className="mt-1 min-h-8 w-full accent-brand-500"
            disabled={controlsDisabled}
            max="10"
            min="1"
            onChange={(event) => onUpdate((current) => ({ ...current, rir: Number(event.target.value) }))}
            type="range"
            value={set.rir ?? 1}
          />
        </label>
        <label className="text-[11px] text-zinc-300">
          <span className="flex justify-between gap-2"><span>RPE</span><span>{set.rpePercent === null ? '—' : `${set.rpePercent}%`}</span></span>
          <input
            aria-label={`RPE serie ${set.setNumber}: ${exerciseName}`}
            className="mt-1 min-h-8 w-full accent-brand-500"
            disabled={controlsDisabled}
            max="100"
            min="0"
            onChange={(event) => onUpdate((current) => ({ ...current, rpePercent: Number(event.target.value) }))}
            step="5"
            type="range"
            value={set.rpePercent ?? 0}
          />
        </label>
      </div>
    </fieldset>
  );
}
