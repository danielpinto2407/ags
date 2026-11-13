export type TrainingLoadUnit = 'lbs' | 'kg';

export interface SingleDayProgram {
  mode: 'SINGLE_DAY';
  routineId: string;
  scheduledFor: string;
}

export interface CycleExerciseProgression {
  exerciseItemId: string;
  baseRepetitions: number;
  repetitionsIncrement: number;
  baseLoad: number | null;
  loadIncrement: number;
  loadUnit: TrainingLoadUnit | null;
}

export interface CycleDay {
  position: number;
  routineId: string;
  exerciseProgressions: CycleExerciseProgression[];
}

export interface CycleProgram {
  mode: 'CYCLE';
  additionalCycleRepeats: number;
  cycleDays: CycleDay[];
}

export type TrainingProgram = SingleDayProgram | CycleProgram;

export interface CycleExerciseTarget {
  exerciseItemId: string;
  repetitions: number;
  load: number | null;
  loadUnit: TrainingLoadUnit | null;
}

export type CycleSlotAttemptStatus = 'COMPLETED' | 'CLOSED_INCOMPLETE';

export function getCycleIterationCount(additionalCycleRepeats: number): number {
  if (!Number.isSafeInteger(additionalCycleRepeats) || additionalCycleRepeats < 0) {
    throw new Error('Los ciclos adicionales deben ser un número entero igual o mayor que cero.');
  }

  return additionalCycleRepeats + 1;
}

export function getNextCycleSlotAttempt(
  additionalCycleRepeats: number,
  previousAttemptCount: number
): number | null {
  const totalAttempts = getCycleIterationCount(additionalCycleRepeats);
  if (!Number.isSafeInteger(previousAttemptCount) || previousAttemptCount < 0 || previousAttemptCount > totalAttempts) {
    throw new Error('Los intentos previos del día de ciclo están fuera del rango configurado.');
  }

  return previousAttemptCount === totalAttempts ? null : previousAttemptCount + 1;
}

export function getCompletedCycleSlotRuns(attempts: readonly CycleSlotAttemptStatus[]): number {
  return attempts.filter((status) => status === 'COMPLETED').length;
}

export function calculateRoutineProgress(completedSets: number, prescribedSets: number): number {
  if (!Number.isSafeInteger(prescribedSets) || prescribedSets < 1) {
    throw new Error('Las series prescritas deben ser un entero positivo.');
  }
  if (!Number.isSafeInteger(completedSets) || completedSets < 0 || completedSets > prescribedSets) {
    throw new Error('Las series completadas deben estar entre cero y las series prescritas.');
  }

  return (completedSets / prescribedSets) * 100;
}

export function validateCycleProgram(program: CycleProgram): void {
  getCycleIterationCount(program.additionalCycleRepeats);
  if (program.cycleDays.length === 0) {
    throw new Error('El ciclo debe tener al menos un día configurado.');
  }

  const positions = program.cycleDays.map(({ position }) => position);
  if (positions.some((position, index) => position !== index + 1)) {
    throw new Error('Los días del ciclo deben estar ordenados en posiciones consecutivas desde uno.');
  }

  for (const day of program.cycleDays) {
    if (!day.routineId) throw new Error('Cada día del ciclo debe tener una rutina asignada.');
    if (day.exerciseProgressions.length === 0) {
      throw new Error('Cada día del ciclo debe tener al menos un ejercicio configurado.');
    }

    const exerciseIds = new Set<string>();
    for (const progression of day.exerciseProgressions) {
      if (exerciseIds.has(progression.exerciseItemId)) {
        throw new Error('Cada ejercicio solo puede tener una progresión por día del ciclo.');
      }
      exerciseIds.add(progression.exerciseItemId);
      calculateCycleExerciseTarget(progression, 1);
    }
  }
}

export function calculateCycleExerciseTarget(
  progression: CycleExerciseProgression,
  completedRuns: number
): CycleExerciseTarget {
  if (!progression.exerciseItemId) throw new Error('El ejercicio de la progresión no es válido.');
  if (!Number.isSafeInteger(progression.baseRepetitions) || progression.baseRepetitions < 1) {
    throw new Error('Las repeticiones iniciales deben ser un entero positivo.');
  }
  if (!Number.isSafeInteger(progression.repetitionsIncrement)) {
    throw new Error('El incremento de repeticiones debe ser un número entero.');
  }
  if (!Number.isSafeInteger(progression.loadIncrement)) {
    throw new Error('El incremento de carga debe ser un número entero.');
  }
  if (progression.baseLoad !== null && (!Number.isSafeInteger(progression.baseLoad) || progression.baseLoad < 0)) {
    throw new Error('La carga inicial debe ser un entero igual o mayor que cero.');
  }
  if (progression.baseLoad === null && (progression.loadIncrement !== 0 || progression.loadUnit !== null)) {
    throw new Error('Define una carga inicial antes de configurar su progresión.');
  }
  if (progression.baseLoad !== null && progression.loadUnit !== 'lbs' && progression.loadUnit !== 'kg') {
    throw new Error('La unidad de carga debe ser lbs o kg.');
  }
  if (!Number.isSafeInteger(completedRuns) || completedRuns < 0) {
    throw new Error('Las ejecuciones completadas deben ser un entero igual o mayor que cero.');
  }

  const repetitions = progression.baseRepetitions + progression.repetitionsIncrement * completedRuns;
  const load = progression.baseLoad === null
    ? null
    : progression.baseLoad + progression.loadIncrement * completedRuns;

  if (!Number.isSafeInteger(repetitions) || repetitions < 1) {
    throw new Error('La progresión produce repeticiones fuera del rango válido.');
  }
  if (load !== null && (!Number.isSafeInteger(load) || load < 0)) {
    throw new Error('La progresión produce una carga fuera del rango válido.');
  }

  return {
    exerciseItemId: progression.exerciseItemId,
    repetitions,
    load,
    loadUnit: progression.loadUnit,
  };
}