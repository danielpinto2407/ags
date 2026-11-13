import { describe, expect, it } from 'vitest';
import {
  calculateRoutineProgress,
  getCompletedExerciseCount,
  validateActualExercisePerformance,
  type ActualExercisePerformance,
} from '@/domain/workoutExecution';

const performance: ActualExercisePerformance = {
  routineItemId: 'item-1',
  completed: true,
  actualRepetitions: 10,
  actualLoad: 40,
  loadUnit: 'kg',
  rir: 3,
  rpePercent: 80,
};

describe('actual workout performance', () => {
  it('accepts one whole-exercise record with reps, load, completion, RIR and RPE', () => {
    expect(() => validateActualExercisePerformance(performance, true)).not.toThrow();
  });

  it('counts each completed exercise once, regardless of prescribed set count', () => {
    expect(getCompletedExerciseCount([performance, { ...performance, routineItemId: 'item-2', completed: false }])).toBe(1);
  });

  it('derives routine progress from completed exercises', () => {
    expect(calculateRoutineProgress(1, 3)).toBeCloseTo(33.333);
    expect(calculateRoutineProgress(0, 3)).toBe(0);
    expect(calculateRoutineProgress(3, 3)).toBe(100);
    expect(() => calculateRoutineProgress(4, 3)).toThrow('ejercicios prescritos');
  });

  it('requires integer repetitions when an exercise is completed', () => {
    expect(() => validateActualExercisePerformance({ ...performance, actualRepetitions: null }, true)).toThrow('repeticiones reales');
    expect(() => validateActualExercisePerformance({ ...performance, actualRepetitions: 10.5 }, true)).toThrow('repeticiones reales');
    expect(() => validateActualExercisePerformance({ ...performance, actualRepetitions: -1 }, true)).toThrow('repeticiones reales');
  });

  it('requires an integer actual load and matching unit for weighted exercises', () => {
    expect(() => validateActualExercisePerformance({ ...performance, actualLoad: null, loadUnit: null }, true)).toThrow('carga real es obligatoria');
    expect(() => validateActualExercisePerformance({ ...performance, actualLoad: 40.5 }, true)).toThrow('carga real');
    expect(() => validateActualExercisePerformance({ ...performance, loadUnit: 'lbs' }, true)).not.toThrow();
    expect(() => validateActualExercisePerformance({ ...performance, loadUnit: null }, true)).toThrow('unidad debe corresponder');
  });

  it('allows bodyweight exercise records without a load', () => {
    expect(() => validateActualExercisePerformance({
      ...performance,
      actualLoad: null,
      loadUnit: null,
    }, false)).not.toThrow();
  });

  it('validates RIR and RPE boundaries', () => {
    expect(() => validateActualExercisePerformance({ ...performance, rir: 0 }, true)).toThrow('RIR');
    expect(() => validateActualExercisePerformance({ ...performance, rir: 11 }, true)).toThrow('RIR');
    expect(() => validateActualExercisePerformance({ ...performance, rir: 2.5 }, true)).toThrow('RIR');
    expect(() => validateActualExercisePerformance({ ...performance, rpePercent: -1 }, true)).toThrow('RPE');
    expect(() => validateActualExercisePerformance({ ...performance, rpePercent: 101 }, true)).toThrow('RPE');
  });
});
