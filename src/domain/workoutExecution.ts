import type { TrainingLoadUnit } from '@/domain/trainingCycle';

export interface ActualSetPerformance {
  setNumber: number;
  completed: boolean;
  actualRepetitions: number | null;
  actualLoad: number | null;
  loadUnit: TrainingLoadUnit | null;
  rir: number | null;
  rpePercent: number | null;
}

export interface LegacyExercisePerformance {
  completed: boolean;
  actualRepetitions: number | null;
  actualLoad: number | null;
  loadUnit: TrainingLoadUnit | null;
  rir: number | null;
  rpePercent: number | null;
}

export interface ActualExercisePerformance {
  routineItemId: string;
  sets: ActualSetPerformance[];
  legacyRecord: LegacyExercisePerformance | null;
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
  completedSets: number;
  prescribedSets: number;
  progressUnit: 'sets' | 'exercises';
  performances: Record<string, ActualExercisePerformance>;
}

export interface CycleSlotHistory {
  attemptCount: number;
  terminalAttemptCount: number;
  completedRuns: number;
}

export interface WorkoutComment {
  id: string;
  executionId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface StudentRoutineHistoryEntry {
  id: string;
  title: string;
  programMode: 'SINGLE_DAY' | 'CYCLE';
  executionDate: string;
  cycleDayTitle: string | null;
  slotAttempt: number | null;
  status: RoutineExecutionStatus;
  completedExercises: number;
  prescribedExercises: number;
  completedUnits: number;
  prescribedUnits: number;
  progressUnit: 'sets' | 'exercises';
  progressPercent: number;
}

export type CoachRoutineExecutionSummary = StudentRoutineHistoryEntry;

export interface CoachRoutineExerciseReview {
  id: string;
  position: number;
  name: string;
  prescribedSets: number;
  prescribedRepetitions: string;
  prescribedLoad: string | null;
  sets: ActualSetPerformance[];
  legacyRecord: LegacyExercisePerformance | null;
}

export interface CoachRoutineExecutionReview extends CoachRoutineExecutionSummary {
  exercises: CoachRoutineExerciseReview[];
  comments: WorkoutComment[];
}

export function validateActualExercisePerformance(
  performance: ActualExercisePerformance,
  requiresLoad: boolean
): void {
  if (!performance.routineItemId) throw new Error('El ejercicio de la ejecución no es válido.');
  if (performance.sets.length === 0) throw new Error('La rutina no tiene series programadas para este ejercicio.');
  const seenSetNumbers = new Set<number>();
  for (const set of performance.sets) {
    if (!Number.isSafeInteger(set.setNumber) || set.setNumber < 1 || seenSetNumbers.has(set.setNumber)) {
      throw new Error('El número de serie no es válido.');
    }
    seenSetNumbers.add(set.setNumber);
    if (typeof set.completed !== 'boolean') throw new Error('El estado de la serie no es válido.');
    if (set.actualRepetitions !== null && (!Number.isSafeInteger(set.actualRepetitions) || set.actualRepetitions < 0)) {
      throw new Error('Las repeticiones deben ser un entero igual o mayor que cero.');
    }
    if (set.completed && set.actualRepetitions === null) {
      throw new Error('Registra las repeticiones de cada serie realizada.');
    }
    if (set.actualLoad !== null && (!Number.isSafeInteger(set.actualLoad) || set.actualLoad < 0)) {
      throw new Error('La carga debe ser un entero igual o mayor que cero.');
    }
    if (set.completed && requiresLoad && set.actualLoad === null) {
      throw new Error('Registra la carga de cada serie realizada.');
    }
    if ((set.actualLoad === null) !== (set.loadUnit === null)) {
      throw new Error('La unidad debe corresponder a la carga de la serie.');
    }
    if (set.loadUnit !== null && set.loadUnit !== 'lbs' && set.loadUnit !== 'kg') {
      throw new Error('La unidad de carga debe ser lbs o kg.');
    }
    if (set.rir !== null && (!Number.isSafeInteger(set.rir) || set.rir < 1 || set.rir > 10)) {
      throw new Error('El RIR debe ser un entero entre 1 y 10.');
    }
    if (set.rpePercent !== null && (!Number.isFinite(set.rpePercent) || set.rpePercent < 0 || set.rpePercent > 100)) {
      throw new Error('El RPE debe estar entre 0 y 100%.');
    }
    if (set.completed && (set.rir === null || set.rpePercent === null)) {
      throw new Error('Registra el esfuerzo de cada serie realizada.');
    }
  }
}

export function createEmptyExercisePerformance(
  routineItemId: string,
  prescribedSets: number
): ActualExercisePerformance {
  if (!Number.isSafeInteger(prescribedSets) || prescribedSets < 1) {
    throw new Error('Las series prescritas deben ser un entero positivo.');
  }
  return {
    routineItemId,
    legacyRecord: null,
    sets: Array.from({ length: prescribedSets }, (_, index) => ({
      setNumber: index + 1,
      completed: false,
      actualRepetitions: null,
      actualLoad: null,
      loadUnit: null,
      rir: null,
      rpePercent: null,
    })),
  };
}

export function getCompletedExerciseCount(
  performances: readonly ActualExercisePerformance[]
): number {
  return performances.filter(({ sets, legacyRecord }) => (
    sets.length > 0 ? sets.every(({ completed }) => completed) : Boolean(legacyRecord?.completed)
  )).length;
}

export function getCompletedSetCount(performances: readonly ActualExercisePerformance[]): number {
  return performances.reduce((total, performance) => (
    total + performance.sets.filter(({ completed }) => completed).length
  ), 0);
}

export function calculateSetProgress(completedSets: number, prescribedSets: number): number {
  if (!Number.isSafeInteger(prescribedSets) || prescribedSets < 1) {
    throw new Error('Las series prescritas deben ser un entero positivo.');
  }
  if (!Number.isSafeInteger(completedSets) || completedSets < 0 || completedSets > prescribedSets) {
    throw new Error('Las series realizadas deben estar entre cero y las series prescritas.');
  }
  return (completedSets / prescribedSets) * 100;
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
