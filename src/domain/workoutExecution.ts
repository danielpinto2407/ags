import type { TrainingLoadUnit } from '@/domain/trainingCycle';

export interface ActualSetPerformance {
  setNumber: number;
  completed: boolean;
  actualRepetitions: number | null;
  actualLoad: number | null;
  loadUnit: TrainingLoadUnit | null;
}

export interface ActualExercisePerformance {
  routineItemId: string;
  sets: ActualSetPerformance[];
  rir: number | null;
  rpePercent: number | null;
}

export type RoutineExecutionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED_INCOMPLETE';

export interface StudentRoutineExecutionSnapshot {
  id: string;
  assignmentId: string;
  cycleDayId: string;
  executionDate: string;
  status: RoutineExecutionStatus;
  slotAttempt: number | null;
  progressPercent: number;
  completedSets: number;
  prescribedSets: number;
  performances: Record<string, ActualExercisePerformance>;
}

export interface CycleSlotHistory {
  attemptCount: number;
  completedRuns: number;
}

export function validateActualExercisePerformance(
  performance: ActualExercisePerformance,
  prescribedSets: number,
  requiresLoad = false
): void {
  if (!performance.routineItemId) throw new Error('El ejercicio de la ejecución no es válido.');
  if (!Number.isSafeInteger(prescribedSets) || prescribedSets < 1) {
    throw new Error('Las series prescritas deben ser un entero positivo.');
  }
  if (!Number.isInteger(performance.rir) && performance.rir !== null) {
    throw new Error('El RIR debe ser un entero entre 1 y 10.');
  }
  if (performance.rir !== null && (performance.rir < 1 || performance.rir > 10)) {
    throw new Error('El RIR debe ser un entero entre 1 y 10.');
  }
  if (performance.rpePercent !== null && (
    !Number.isFinite(performance.rpePercent)
    || performance.rpePercent < 0
    || performance.rpePercent > 100
  )) {
    throw new Error('El RPE debe estar entre 0 y 100%.');
  }
  if (performance.sets.length > prescribedSets) {
    throw new Error('No se pueden registrar más series que las prescritas.');
  }

  const setNumbers = new Set<number>();
  for (const set of performance.sets) {
    if (!Number.isSafeInteger(set.setNumber) || set.setNumber < 1 || set.setNumber > prescribedSets) {
      throw new Error('El número de serie está fuera de las series prescritas.');
    }
    if (setNumbers.has(set.setNumber)) throw new Error('La serie ya fue registrada.');
    setNumbers.add(set.setNumber);

    if (set.completed && (!Number.isSafeInteger(set.actualRepetitions) || (set.actualRepetitions ?? 0) < 0)) {
      throw new Error('Las repeticiones reales deben ser un entero igual o mayor que cero.');
    }
    if (set.completed && requiresLoad && set.actualLoad === null) {
      throw new Error('La carga real es obligatoria para este ejercicio.');
    }
    if (set.actualRepetitions !== null && (!Number.isSafeInteger(set.actualRepetitions) || set.actualRepetitions < 0)) {
      throw new Error('Las repeticiones reales deben ser un entero igual o mayor que cero.');
    }
    if (set.actualLoad !== null && (!Number.isSafeInteger(set.actualLoad) || set.actualLoad < 0)) {
      throw new Error('La carga real debe ser un entero igual o mayor que cero.');
    }
    if ((set.actualLoad === null) !== (set.loadUnit === null)) {
      throw new Error('La unidad debe corresponder a la carga real.');
    }
    if (set.loadUnit !== null && set.loadUnit !== 'lbs' && set.loadUnit !== 'kg') {
      throw new Error('La unidad de carga debe ser lbs o kg.');
    }
  }
}

export function getCompletedSetCount(performance: ActualExercisePerformance): number {
  return performance.sets.filter((set) => set.completed).length;
}
