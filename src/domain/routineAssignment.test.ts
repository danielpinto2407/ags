import { describe, expect, it } from 'vitest';
import {
  toRoutineAssignment,
  toRoutineAssignmentItem,
  withCurrentTenantExerciseVideos,
} from '@/domain/routineAssignment';

const assignmentItemRow = {
  id: 'item-id',
  assignment_id: 'assignment-id',
  tenant_id: 'tenant-id',
  position: 0,
  catalog_exercise_id: 'catalog-exercise-id',
  tenant_exercise_id: null,
  exercise_snapshot: {
    id: 'catalog-exercise-id',
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
  },
  prescribed_sets: 4,
  prescribed_reps: '10-12',
  target_load: '40 kg',
  work_duration: null,
  rest: '90 s',
};

const assignmentRow = {
  id: 'assignment-id',
  tenant_id: 'tenant-id',
  coach_id: 'coach-id',
  student_id: 'student-id',
  scheduled_for: '2026-11-12',
  title: 'Rutina jueves',
  status: 'PUBLISHED',
  published_at: '2026-11-11T12:00:00.000Z',
  created_at: '2026-11-11T11:00:00.000Z',
  updated_at: '2026-11-11T12:00:00.000Z',
};

describe('routine assignment mapping', () => {
  it('maps immutable exercise snapshots and prescription separately', () => {
    expect(toRoutineAssignmentItem(assignmentItemRow)).toEqual({
      id: 'item-id',
      position: 0,
      source: 'catalog',
      sourceId: 'catalog-exercise-id',
      exercise: assignmentItemRow.exercise_snapshot,
      prescribedSets: 4,
      prescribedReps: '10-12',
      targetLoad: '40 kg',
      workDuration: null,
      rest: '90 s',
    });
  });

  it('rejects item records without exactly one valid source', () => {
    expect(() => toRoutineAssignmentItem({
      ...assignmentItemRow,
      tenant_exercise_id: 'tenant-exercise-id',
    })).toThrow('no es válido');
  });

  it('maps assignment metadata and keeps items in prescribed order', () => {
    const laterItem = { ...toRoutineAssignmentItem(assignmentItemRow), id: 'later', position: 1 };
    const firstItem = { ...toRoutineAssignmentItem(assignmentItemRow), id: 'first', position: 0 };
    const assignment = toRoutineAssignment(assignmentRow, [laterItem, firstItem]);

    expect(assignment.studentId).toBe('student-id');
    expect(assignment.status).toBe('PUBLISHED');
    expect(assignment.items.map((item) => item.id)).toEqual(['first', 'later']);
  });

  it('refreshes only the current video URL for assigned tenant exercises', () => {
    const tenantItem = toRoutineAssignmentItem({
      ...assignmentItemRow,
      id: 'tenant-item-id',
      catalog_exercise_id: null,
      tenant_exercise_id: 'tenant-exercise-id',
      exercise_snapshot: { ...assignmentItemRow.exercise_snapshot, videoUrl: 'https://youtu.be/oldVideo001' },
    });
    const catalogItem = toRoutineAssignmentItem(assignmentItemRow);
    const assignment = toRoutineAssignment(assignmentRow, [tenantItem, catalogItem]);

    const refreshed = withCurrentTenantExerciseVideos(assignment, [
      { tenantExerciseId: 'tenant-exercise-id', videoUrl: 'https://youtu.be/newVideo001' },
    ]);

    expect(refreshed.items[0].exercise.videoUrl).toBe('https://youtu.be/newVideo001');
    expect(refreshed.items[0].exercise.instructions).toBe(tenantItem.exercise.instructions);
    expect(refreshed.items[0].prescribedSets).toBe(tenantItem.prescribedSets);
    expect(refreshed.items[1].exercise.videoUrl).toBe(catalogItem.exercise.videoUrl);
    expect(assignment.items[0].exercise.videoUrl).toBe('https://youtu.be/oldVideo001');
  });

  it('can clear the current video URL when the coach removes it', () => {
    const tenantItem = toRoutineAssignmentItem({
      ...assignmentItemRow,
      catalog_exercise_id: null,
      tenant_exercise_id: 'tenant-exercise-id',
    });
    const assignment = toRoutineAssignment(assignmentRow, [tenantItem]);

    const refreshed = withCurrentTenantExerciseVideos(assignment, [
      { tenantExerciseId: 'tenant-exercise-id', videoUrl: null },
    ]);

    expect(refreshed.items[0].exercise.videoUrl).toBeNull();
  });
});
