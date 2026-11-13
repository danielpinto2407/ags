import { describe, expect, it } from 'vitest';
import {
  getCompletedSetCount,
  validateActualExercisePerformance,
  type ActualExercisePerformance,
} from '@/domain/workoutExecution';

const performance: ActualExercisePerformance = {
  routineItemId: 'item-1',
  sets: [
    { setNumber: 1, completed: true, actualRepetitions: 10, actualLoad: 40, loadUnit: 'kg' },
    { setNumber: 2, completed: false, actualRepetitions: null, actualLoad: null, loadUnit: null },
  ],
  rir: 3,
  rpePercent: 80,
};

describe('actual workout performance', () => {
  it('accepts integer set performance and bounded RIR/RPE values', () => {
    expect(() => validateActualExercisePerformance(performance, 3)).not.toThrow();
  });

  it('counts completed sets for derived routine progress', () => {
    expect(getCompletedSetCount(performance)).toBe(1);
  });

  it('rejects invalid prescribed-set counts, duplicate sets, and out-of-range set numbers', () => {
    expect(() => validateActualExercisePerformance(performance, 0)).toThrow('series prescritas');
    expect(() => validateActualExercisePerformance({
      ...performance,
      sets: [performance.sets[0], { ...performance.sets[0] }],
    }, 3)).toThrow('ya fue registrada');
    expect(() => validateActualExercisePerformance({
      ...performance,
      sets: [{ ...performance.sets[0], setNumber: 4 }],
    }, 3)).toThrow('fuera de las series');
  });

  it('rejects non-integer repetitions and load values', () => {
    expect(() => validateActualExercisePerformance({
      ...performance,
      sets: [{ ...performance.sets[0], actualRepetitions: 10.5 }],
    }, 3)).toThrow('repeticiones reales');
    expect(() => validateActualExercisePerformance({
      ...performance,
      sets: [{ ...performance.sets[0], actualLoad: 40.5 }],
    }, 3)).toThrow('carga real');
  });

  it('requires actual repetitions for completed sets and a unit for weighted sets', () => {
    expect(() => validateActualExercisePerformance({
      ...performance,
      sets: [{ ...performance.sets[0], actualRepetitions: null }],
    }, 3)).toThrow('repeticiones reales');
    expect(() => validateActualExercisePerformance({
      ...performance,
      sets: [{ ...performance.sets[0], loadUnit: null }],
    }, 3)).toThrow('unidad debe corresponder');
    expect(() => validateActualExercisePerformance({
      ...performance,
      sets: [{ ...performance.sets[0], actualLoad: null, loadUnit: null }],
    }, 3, true)).toThrow('carga real es obligatoria');
  });

  it('enforces RIR and RPE boundaries', () => {
    expect(() => validateActualExercisePerformance({ ...performance, rir: 0 }, 3)).toThrow('RIR');
    expect(() => validateActualExercisePerformance({ ...performance, rir: 11 }, 3)).toThrow('RIR');
    expect(() => validateActualExercisePerformance({ ...performance, rir: 2.5 }, 3)).toThrow('RIR');
    expect(() => validateActualExercisePerformance({ ...performance, rpePercent: -1 }, 3)).toThrow('RPE');
    expect(() => validateActualExercisePerformance({ ...performance, rpePercent: 101 }, 3)).toThrow('RPE');
  });
});
