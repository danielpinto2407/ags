import { describe, expect, it } from 'vitest';
import {
  calculateSetProgress,
  calculateRoutineProgress,
  createEmptyExercisePerformance,
  getCompletedExerciseCount,
  getCompletedSetCount,
  validateActualExercisePerformance,
  type ActualExercisePerformance,
} from '@/domain/workoutExecution';

const performance: ActualExercisePerformance = {
  routineItemId: 'item-1',
  legacyRecord: null,
  sets: [
    { setNumber: 1, completed: true, actualRepetitions: 10, actualLoad: 40, loadUnit: 'kg', rir: 3, rpePercent: 80 },
    { setNumber: 2, completed: false, actualRepetitions: null, actualLoad: null, loadUnit: null, rir: null, rpePercent: null },
    { setNumber: 3, completed: true, actualRepetitions: 9, actualLoad: 40, loadUnit: 'kg', rir: 2, rpePercent: 85 },
  ],
};

describe('actual workout performance', () => {
  it('accepts per-series reps, load, completion, RIR and RPE', () => {
    expect(() => validateActualExercisePerformance(performance, true)).not.toThrow();
  });

  it('creates a typed blank performance row for each prescribed series', () => {
    expect(createEmptyExercisePerformance('item-1', 3).sets).toEqual([
      { setNumber: 1, completed: false, actualRepetitions: null, actualLoad: null, loadUnit: null, rir: null, rpePercent: null },
      { setNumber: 2, completed: false, actualRepetitions: null, actualLoad: null, loadUnit: null, rir: null, rpePercent: null },
      { setNumber: 3, completed: false, actualRepetitions: null, actualLoad: null, loadUnit: null, rir: null, rpePercent: null },
    ]);
  });

  it('counts progress per completed series and counts an exercise complete only when all its series are done', () => {
    expect(getCompletedSetCount([performance])).toBe(2);
    expect(calculateSetProgress(2, 6)).toBeCloseTo(33.333);
    expect(getCompletedExerciseCount([performance])).toBe(0);
    expect(getCompletedExerciseCount([{ ...performance, sets: performance.sets.map((set) => ({ ...set, completed: true })) }])).toBe(1);
    expect(() => calculateSetProgress(7, 6)).toThrow('series prescritas');
  });

  it('derives routine progress from completed exercises', () => {
    expect(calculateRoutineProgress(1, 3)).toBeCloseTo(33.333);
    expect(calculateRoutineProgress(0, 3)).toBe(0);
    expect(calculateRoutineProgress(3, 3)).toBe(100);
    expect(() => calculateRoutineProgress(4, 3)).toThrow('ejercicios prescritos');
  });

  it('requires integer repetitions and effort on every completed set', () => {
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], actualRepetitions: null }] }, true)).toThrow('repeticiones');
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], actualRepetitions: 10.5 }] }, true)).toThrow('repeticiones');
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], actualRepetitions: -1 }] }, true)).toThrow('repeticiones');
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], rir: null }] }, true)).toThrow('esfuerzo');
  });

  it('requires a valid load and matching unit per completed weighted set', () => {
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], actualLoad: null, loadUnit: null }] }, true)).toThrow('carga de cada serie');
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], actualLoad: 40.5 }] }, true)).toThrow('carga');
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], loadUnit: 'lbs' }] }, true)).not.toThrow();
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], loadUnit: null }] }, true)).toThrow('unidad debe corresponder');
  });

  it('allows bodyweight exercise records without a load', () => {
    expect(() => validateActualExercisePerformance({
      ...performance,
      sets: [{ ...performance.sets[0], actualLoad: null, loadUnit: null }],
    }, false)).not.toThrow();
  });

  it('validates RIR and RPE boundaries', () => {
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], rir: 0 }] }, true)).toThrow('RIR');
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], rir: 11 }] }, true)).toThrow('RIR');
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], rir: 2.5 }] }, true)).toThrow('RIR');
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], rpePercent: -1 }] }, true)).toThrow('RPE');
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], rpePercent: 101 }] }, true)).toThrow('RPE');
  });

  it('rejects duplicate or invalid series numbers', () => {
    expect(() => validateActualExercisePerformance({ ...performance, sets: [{ ...performance.sets[0], setNumber: 1 }, { ...performance.sets[1], setNumber: 1 }] }, true)).toThrow('número de serie');
    expect(() => createEmptyExercisePerformance('item-1', 0)).toThrow('entero positivo');
  });
});
