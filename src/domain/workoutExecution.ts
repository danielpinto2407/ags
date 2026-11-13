import type { TrainingLoadUnit } from '@/domain/trainingCycle';

export interface ActualExercisePerformance {
  routineItemId: string;
  completed: boolean;
  actualRepetitions: number | null;
  actualLoad: number | null;
  loadUnit: TrainingLoadUnit | null;
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
  completedExercises: number;
  prescribedExercises: number;
  performances: Record<string, ActualExercisePerformance>;
}

export interface CycleSlotHistory {
  attemptCount: number;
  completedRuns: number;
}

export function validateActualExercisePerformance(
  performance: ActualExercisePerformance,
  requiresLoad: boolean
): void {
  if (!performance.routineItemId) throw new Error('El ejercicio de la ejecución no es válido.');
  if (typeof performance.completed !== 'boolean') throw new Error('El estado del ejercicio no es válido.');

  if (performance.actualRepetitions !== null && (
    !Number.isSafeInteger(performance.actualRepetitions) || performance.actualRepetitions < 0
  )) {
    throw new Error('Las repeticiones reales deben ser un entero igual o mayor que cero.');
  }
  if (performance.completed && performance.actualRepetitions === null) {
    throw new Error('Las repeticiones reales son obligatorias al completar el ejercicio.');
  }

  if (performance.actualLoad !== null && (
    !Number.isSafeInteger(performance.actualLoad) || performance.actualLoad < 0
  )) {
    throw new Error('La carga real debe ser un entero igual o mayor que cero.');
  }
  if (performance.completed && requiresLoad && performance.actualLoad === null) {
    throw new Error('La carga real es obligatoria para este ejercicio.');
  }
  if ((performance.actualLoad === null) !== (performance.loadUnit === null)) {
    throw new Error('La unidad debe corresponder a la carga real.');
  }
  if (performance.loadUnit !== null && performance.loadUnit !== 'lbs' && performance.loadUnit !== 'kg') {
    throw new Error('La unidad de carga debe ser lbs o kg.');
  }

  if (performance.rir !== null && (
    !Number.isSafeInteger(performance.rir) || performance.rir < 1 || performance.rir > 10
  )) {
    throw new Error('El RIR debe ser un entero entre 1 y 10.');
  }
  if (performance.rpePercent !== null && (
    !Number.isFinite(performance.rpePercent)
    || performance.rpePercent < 0
    || performance.rpePercent > 100
  )) {
    throw new Error('El RPE debe estar entre 0 y 100%.');
  }
}

export function getCompletedExerciseCount(
  performances: readonly ActualExercisePerformance[]
): number {
  return performances.filter(({ completed }) => completed).length;
}

export function calculateRoutineProgress(completedExercises: number, prescribedExercises: number): number {
  if (!Number.isSafeInteger(prescribedExercises) || prescribedExercises < 1) {
    throw new Error('Los ejercicios prescritos deben ser un entero positivo.');
  }
  if (!Number.isSafeInteger(completedExercises) || completedExercises < 0 || completedExercises > prescribedExercises) {
    throw new Error('Los ejercicios completados deben estar entre cero y los ejercicios prescritos.');
  }

  return (completedExercises / prescribedExercises) * 100;
}
