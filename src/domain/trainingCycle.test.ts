import { describe, expect, it } from 'vitest';
import {
  calculateCycleExerciseTarget,
  calculateRoutineProgress,
  getCompletedCycleSlotRuns,
  getCycleIterationCount,
  getNextCycleSlotAttempt,
  validateCycleProgram,
  type CycleExerciseProgression,
  type CycleProgram,
} from '@/domain/trainingCycle';

const deadlift: CycleExerciseProgression = {
  exerciseItemId: 'deadlift',
  baseRepetitions: 8,
  repetitionsIncrement: 2,
  baseLoad: 40,
  loadIncrement: 20,
  loadUnit: 'lbs',
};

const backSquat: CycleExerciseProgression = {
  exerciseItemId: 'back-squat',
  baseRepetitions: 6,
  repetitionsIncrement: 1,
  baseLoad: 30,
  loadIncrement: 2,
  loadUnit: 'kg',
};

function cycleWithDays(dayCount: number): CycleProgram {
  return {
    mode: 'CYCLE',
    additionalCycleRepeats: 0,
    cycleDays: Array.from({ length: dayCount }, (_, index) => ({
      position: index + 1,
      routineId: `routine-${index + 1}`,
      exerciseProgressions: [deadlift],
    })),
  };
}

describe('cycle plan domain', () => {
  it('counts the authored cycle as iteration one and adds the configured repeats', () => {
    expect(getCycleIterationCount(0)).toBe(1);
    expect(getCycleIterationCount(2)).toBe(3);
  });

  it('tracks attempts independently per slot and stops after the configured total', () => {
    expect(getNextCycleSlotAttempt(2, 0)).toBe(1);
    expect(getNextCycleSlotAttempt(2, 2)).toBe(3);
    expect(getNextCycleSlotAttempt(2, 3)).toBeNull();
  });

  it('accepts a cycle with N ordinal routine slots and no calendar-date binding', () => {
    expect(() => validateCycleProgram(cycleWithDays(4))).not.toThrow();
  });

  it('validates that cycle day positions are unique and contiguous', () => {
    expect(() => validateCycleProgram({
      ...cycleWithDays(2),
      cycleDays: [
        { position: 1, routineId: 'routine-1', exerciseProgressions: [deadlift] },
        { position: 1, routineId: 'routine-2', exerciseProgressions: [backSquat] },
      ],
    })).toThrow('ordenados');
  });

  it('compounds independent exercise progression only after a completed slot execution', () => {
    expect(calculateCycleExerciseTarget(deadlift, 0)).toEqual({
      exerciseItemId: 'deadlift', repetitions: 8, load: 40, loadUnit: 'lbs',
    });
    expect(calculateCycleExerciseTarget(deadlift, 2)).toEqual({
      exerciseItemId: 'deadlift', repetitions: 12, load: 80, loadUnit: 'lbs',
    });
    expect(calculateCycleExerciseTarget(backSquat, 2)).toEqual({
      exerciseItemId: 'back-squat', repetitions: 8, load: 34, loadUnit: 'kg',
    });
  });

  it('does not advance a slot target when its prior execution was incomplete', () => {
    const completedRuns = getCompletedCycleSlotRuns(['CLOSED_INCOMPLETE']);
    expect(completedRuns).toBe(0);
    expect(calculateCycleExerciseTarget(deadlift, completedRuns)).toEqual({
      exerciseItemId: 'deadlift', repetitions: 8, load: 40, loadUnit: 'lbs',
    });
  });

  it('advances only completed slot executions, while incomplete attempts consume a slot attempt', () => {
    const statuses = ['COMPLETED', 'CLOSED_INCOMPLETE'] as const;
    expect(getCompletedCycleSlotRuns(statuses)).toBe(1);
    expect(getNextCycleSlotAttempt(2, statuses.length)).toBe(3);
    expect(calculateCycleExerciseTarget(deadlift, getCompletedCycleSlotRuns(statuses))).toEqual({
      exerciseItemId: 'deadlift', repetitions: 10, load: 60, loadUnit: 'lbs',
    });
  });

  it('calculates progress from completed sets rather than exercise count', () => {
    expect(calculateRoutineProgress(1, 5)).toBe(20);
    expect(calculateRoutineProgress(0, 5)).toBe(0);
    expect(calculateRoutineProgress(5, 5)).toBe(100);
    expect(() => calculateRoutineProgress(6, 5)).toThrow('series prescritas');
  });

  it('supports bodyweight exercises without load progression', () => {
    expect(calculateCycleExerciseTarget({
      exerciseItemId: 'bodyweight',
      baseRepetitions: 10,
      repetitionsIncrement: 1,
      baseLoad: null,
      loadIncrement: 0,
      loadUnit: null,
    }, 2)).toEqual({
      exerciseItemId: 'bodyweight', repetitions: 12, load: null, loadUnit: null,
    });
  });

  it('rejects invalid repeat counts, empty slots, fractional values, and unsupported load units', () => {
    expect(() => getCycleIterationCount(-1)).toThrow('igual o mayor que cero');
    expect(() => getCycleIterationCount(1.5)).toThrow('igual o mayor que cero');
    expect(() => validateCycleProgram({ ...cycleWithDays(1), cycleDays: [] })).toThrow('al menos un día');
    expect(() => validateCycleProgram({
      ...cycleWithDays(1),
      cycleDays: [{ position: 1, routineId: 'routine-1', exerciseProgressions: [] }],
    })).toThrow('al menos un ejercicio');
    expect(() => calculateCycleExerciseTarget({ ...deadlift, repetitionsIncrement: 0.5 }, 1)).toThrow('número entero');
    expect(() => calculateCycleExerciseTarget({ ...deadlift, loadUnit: 'oz' as 'lbs' }, 1)).toThrow('lbs o kg');
  });

  it('rejects progression targets below the minimum valid repetitions or load', () => {
    expect(() => calculateCycleExerciseTarget({ ...deadlift, repetitionsIncrement: -8 }, 1)).toThrow('repeticiones fuera');
    expect(() => calculateCycleExerciseTarget({ ...deadlift, loadIncrement: -50 }, 1)).toThrow('carga fuera');
  });
});
