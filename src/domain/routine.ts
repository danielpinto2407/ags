import type { Exercise } from '@/domain/exercise';
import type { RoutineMap } from '@/types';

export function isRoutineMap(value: unknown): value is RoutineMap {
  if (!value || typeof value !== 'object') return false;

  return Object.values(value as Record<string, unknown>).every((exercises) => (
    Array.isArray(exercises) && exercises.every(isExercise)
  ));
}

function isExercise(value: unknown): value is Exercise {
  if (!value || typeof value !== 'object') return false;

  const exercise = value as Partial<Exercise>;
  return typeof exercise.id === 'string'
    && typeof exercise.name === 'string'
    && typeof exercise.series === 'number'
    && typeof exercise.reps === 'string'
    && typeof exercise.weight === 'string'
    && typeof exercise.rest === 'string'
    && typeof exercise.emoji === 'string'
    && typeof exercise.muscles === 'string'
    && typeof exercise.instructions === 'string'
    && typeof exercise.tips === 'string'
    && typeof exercise.difficulty === 'string';
}
