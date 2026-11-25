import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CoachRoutineExecutionSummary } from '@/domain/workoutExecution';
import { formatLocalDate } from '@/domain/localDate';

const executionStatusLabels = {
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
  CLOSED_INCOMPLETE: 'Incompleto',
} as const;

interface CoachWorkoutHistoryEntrySummaryProps {
  entry: CoachRoutineExecutionSummary;
  isSelected: boolean;
  onToggle: (executionId: string) => void;
}

export default function CoachWorkoutHistoryEntrySummary({ entry, isSelected, onToggle }: CoachWorkoutHistoryEntrySummaryProps) {
  const title = entry.programMode === 'CYCLE' ? entry.cycleDayTitle ?? entry.title : entry.title;
  return (
    <>
      <button
        aria-controls={`coach-workout-review-${entry.id}`}
        aria-expanded={isSelected}
        className={`flex min-h-16 w-full items-center gap-3 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brand-400 ${isSelected ? 'border-l-4 border-brand-500 bg-zinc-900 text-white' : 'hover:bg-brand-950/30'}`}
        onClick={() => onToggle(entry.id)}
        type="button"
      >
        {isSelected
          ? <ChevronDown aria-hidden="true" className="shrink-0 text-brand-300" size={17} />
          : <ChevronRight aria-hidden="true" className="shrink-0 text-zinc-400" size={17} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{title}</span>
          <span className="mt-0.5 block text-xs text-zinc-400">
            {formatLocalDate(entry.executionDate)}
            {entry.slotAttempt !== null ? ` · Ciclo ${entry.slotAttempt}` : ''}
            {' · '}{executionStatusLabels[entry.status]}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-sm font-bold text-brand-200">{Math.round(entry.progressPercent)}%</span>
          <span className="block text-[10px] text-zinc-300">
            {entry.progressUnit === 'sets'
              ? `${entry.completedUnits}/${entry.prescribedUnits} series`
              : `${entry.completedUnits}/${entry.prescribedUnits} ejercicios`}
          </span>
        </span>
      </button>
      <span
        aria-label={`${Math.round(entry.progressPercent)}% de ${entry.progressUnit === 'sets' ? 'series' : 'ejercicios'} completados`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(entry.progressPercent)}
        className={`block h-1 w-full ${isSelected ? 'bg-zinc-700' : 'bg-zinc-800'}`}
        role="progressbar"
      >
        <span className="block h-full bg-brand-500" style={{ width: `${entry.progressPercent}%` }} />
      </span>
    </>
  );
}
