import { describe, expect, it } from 'vitest';
import { formatMuscleName, toExerciseDefinition, toExerciseDefinitionInput } from '@/domain/exerciseDefinition';

const catalogRow = {
  id: 'exercise-id',
  name: 'Hip thrust con barra',
  focus: 'GLUTES',
  primary_muscles: ['gluteus maximus'],
  secondary_muscles: ['hamstrings'],
  equipment: ['BARBELL', 'BENCH'],
  movement_pattern: 'HIP_THRUST',
  difficulty: 'INTERMEDIATE',
  instructions: 'Empuja el suelo y extiende la cadera.',
  tips: 'Mantén las costillas controladas.',
  video_url: null,
  created_at: '2026-11-11T12:00:00.000Z',
  archived_at: null,
};

describe('exercise definition mapping', () => {
  it('maps database enums and fields into a validated exercise definition', () => {
    expect(toExerciseDefinition(catalogRow)).toEqual({
      id: 'exercise-id',
      name: 'Hip thrust con barra',
      focus: 'GLUTES',
      primaryMuscles: ['gluteus maximus'],
      secondaryMuscles: ['hamstrings'],
      equipment: ['BARBELL', 'BENCH'],
      movementPattern: 'HIP_THRUST',
      difficulty: 'INTERMEDIATE',
      instructions: 'Empuja el suelo y extiende la cadera.',
      tips: 'Mantén las costillas controladas.',
      videoUrl: null,
      sourceCatalogExerciseId: null,
      createdAt: '2026-11-11T12:00:00.000Z',
      archivedAt: null,
    });
  });

  it('keeps tenant copy provenance and converts to an assignment-independent input', () => {
    const exercise = toExerciseDefinition({ ...catalogRow, source_catalog_exercise_id: 'catalog-id' });
    expect(exercise.sourceCatalogExerciseId).toBe('catalog-id');
    expect(toExerciseDefinitionInput(exercise)).toEqual({
      name: catalogRow.name,
      focus: catalogRow.focus,
      primaryMuscles: catalogRow.primary_muscles,
      secondaryMuscles: catalogRow.secondary_muscles,
      equipment: catalogRow.equipment,
      movementPattern: catalogRow.movement_pattern,
      difficulty: catalogRow.difficulty,
      instructions: catalogRow.instructions,
      tips: catalogRow.tips,
      videoUrl: null,
    });
  });

  it('rejects invalid enum and malformed media fields from the database', () => {
    expect(() => toExerciseDefinition({ ...catalogRow, focus: 'LEGS' })).toThrow('no es válido');
    expect(() => toExerciseDefinition({ ...catalogRow, video_url: 42 })).toThrow('no es válido');
  });

  it('formats seeded muscle identifiers with Spanish labels', () => {
    expect(formatMuscleName('gluteus maximus')).toBe('Glúteo mayor');
    expect(formatMuscleName('unknown muscle')).toBe('unknown muscle');
  });
});
