import {
  EXERCISE_DIFFICULTIES,
  EXERCISE_EQUIPMENT,
  EXERCISE_FOCUSES,
  EXERCISE_MOVEMENT_PATTERNS,
} from '@/domain/exerciseDefinition';
import type {
  ExerciseDefinitionDifficulty,
  ExerciseEquipment,
  ExerciseFocus,
  ExerciseMovementPattern,
} from '@/domain/exerciseDefinition';

export type RoutineAssignmentStatus = 'DRAFT' | 'PUBLISHED';
export type RoutineExerciseSource = 'catalog' | 'tenant';
export type RoutineProgramMode = 'SINGLE_DAY' | 'CYCLE';

export interface RoutineExerciseSnapshot {
  id: string;
  name: string;
  focus: ExerciseFocus;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: ExerciseEquipment[];
  movementPattern: ExerciseMovementPattern;
  difficulty: ExerciseDefinitionDifficulty;
  instructions: string;
  tips: string;
  videoUrl: string | null;
}

export interface RoutineAssignmentItem {
  id: string;
  position: number;
  cycleDayId: string;
  cycleDayPosition: number;
  source: RoutineExerciseSource;
  sourceId: string;
  exercise: RoutineExerciseSnapshot;
  prescribedSets: number;
  prescribedReps: string;
  targetLoad: string;
  coachInstructions: string | null;
  rest: string;
  baseRepetitions: number | null;
  repetitionsIncrement: number;
  baseLoad: number | null;
  loadIncrement: number;
  loadUnit: 'lbs' | 'kg' | null;
}

export interface RoutineAssignmentDay {
  id: string;
  position: number;
  title: string;
  items: RoutineAssignmentItem[];
}

export interface RoutineAssignment {
  id: string;
  tenantId: string;
  coachId: string;
  studentId: string;
  programMode: RoutineProgramMode;
  scheduledFor: string | null;
  additionalCycleRepeats: number;
  cycleDayCount: number;
  title: string;
  status: RoutineAssignmentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  days: RoutineAssignmentDay[];
  items: RoutineAssignmentItem[];
}

export interface RoutineAssignmentItemInput {
  source: RoutineExerciseSource;
  sourceId: string;
  prescribedSets: number;
  prescribedReps: string;
  targetLoad: string;
  coachInstructions: string | null;
  rest: string;
  baseRepetitions?: number | null;
  repetitionsIncrement?: number;
  baseLoad?: number | null;
  loadIncrement?: number;
  loadUnit?: 'lbs' | 'kg' | null;
}

export interface RoutineAssignmentDayInput {
  position: number;
  title: string;
  items: RoutineAssignmentItemInput[];
}

export interface SaveTrainingProgramDraftInput {
  assignmentId: string | null;
  studentId: string;
  programMode: RoutineProgramMode;
  scheduledFor: string | null;
  title: string;
  additionalCycleRepeats: number;
  days: RoutineAssignmentDayInput[];
}

export interface SaveRoutineAssignmentDraftInput {
  assignmentId: string | null;
  studentId: string;
  scheduledFor: string;
  title: string;
  items: RoutineAssignmentItemInput[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every((item) => typeof item === 'string')
);

function toRoutineExerciseSnapshot(value: unknown): RoutineExerciseSnapshot {
  if (!isRecord(value)) throw new Error('El snapshot del ejercicio no es válido.');
  const snapshot = value;
  if (
    typeof snapshot.id !== 'string'
    || typeof snapshot.name !== 'string'
    || typeof snapshot.focus !== 'string'
    || !EXERCISE_FOCUSES.includes(snapshot.focus as ExerciseFocus)
    || !isStringArray(snapshot.primaryMuscles)
    || !isStringArray(snapshot.secondaryMuscles)
    || !Array.isArray(snapshot.equipment)
    || !snapshot.equipment.every((item) => typeof item === 'string' && EXERCISE_EQUIPMENT.includes(item as ExerciseEquipment))
    || typeof snapshot.movementPattern !== 'string'
    || !EXERCISE_MOVEMENT_PATTERNS.includes(snapshot.movementPattern as ExerciseMovementPattern)
    || typeof snapshot.difficulty !== 'string'
    || !EXERCISE_DIFFICULTIES.includes(snapshot.difficulty as ExerciseDefinitionDifficulty)
    || typeof snapshot.instructions !== 'string'
    || typeof snapshot.tips !== 'string'
    || (snapshot.videoUrl !== null && typeof snapshot.videoUrl !== 'string')
  ) {
    throw new Error('El snapshot del ejercicio no es válido.');
  }

  return {
    id: snapshot.id,
    name: snapshot.name,
    focus: snapshot.focus as ExerciseFocus,
    primaryMuscles: snapshot.primaryMuscles,
    secondaryMuscles: snapshot.secondaryMuscles,
    equipment: snapshot.equipment as ExerciseEquipment[],
    movementPattern: snapshot.movementPattern as ExerciseMovementPattern,
    difficulty: snapshot.difficulty as ExerciseDefinitionDifficulty,
    instructions: snapshot.instructions,
    tips: snapshot.tips,
    videoUrl: snapshot.videoUrl,
  };
}

export function toRoutineAssignmentItem(value: unknown): RoutineAssignmentItem {
  if (!isRecord(value)) throw new Error('El ejercicio programado no es válido.');
  const row = value;
  const catalogId = row.catalog_exercise_id;
  const tenantExerciseId = row.tenant_exercise_id;
  const sourceId = typeof catalogId === 'string' ? catalogId : tenantExerciseId;
  const source = typeof catalogId === 'string' ? 'catalog' : 'tenant';
  if (
    typeof row.id !== 'string'
    || typeof row.position !== 'number'
    || typeof row.cycle_day_id !== 'string'
    || typeof row.cycle_day_position !== 'number'
    || (typeof catalogId !== 'string' && typeof tenantExerciseId !== 'string')
    || (catalogId !== null && tenantExerciseId !== null)
    || typeof row.prescribed_sets !== 'number'
    || typeof row.prescribed_reps !== 'string'
    || typeof row.target_load !== 'string'
    || (row.coach_instructions != null && typeof row.coach_instructions !== 'string')
    || (row.work_duration != null && typeof row.work_duration !== 'string')
    || typeof row.rest !== 'string'
    || (row.base_repetitions !== null && typeof row.base_repetitions !== 'number')
    || typeof row.repetitions_increment !== 'number'
    || (row.base_load !== null && typeof row.base_load !== 'number')
    || typeof row.load_increment !== 'number'
    || (row.load_unit !== null && row.load_unit !== 'lbs' && row.load_unit !== 'kg')
  ) {
    throw new Error('El ejercicio programado no es válido.');
  }

  return {
    id: row.id,
    position: row.position,
    cycleDayId: row.cycle_day_id,
    cycleDayPosition: row.cycle_day_position,
    source,
    sourceId: sourceId as string,
    exercise: toRoutineExerciseSnapshot(row.exercise_snapshot),
    prescribedSets: row.prescribed_sets,
    prescribedReps: row.prescribed_reps,
    targetLoad: row.target_load,
    coachInstructions: typeof row.coach_instructions === 'string'
      ? row.coach_instructions
      : (typeof row.work_duration === 'string' ? row.work_duration : null),
    rest: row.rest,
    baseRepetitions: row.base_repetitions,
    repetitionsIncrement: row.repetitions_increment,
    baseLoad: row.base_load,
    loadIncrement: row.load_increment,
    loadUnit: row.load_unit,
  };
}

export function toRoutineAssignment(value: unknown, days: RoutineAssignmentDay[]): RoutineAssignment {
  if (!isRecord(value)) throw new Error('La asignación de rutina recibida no es válida.');
  const row = value;
  if (
    typeof row.id !== 'string'
    || typeof row.tenant_id !== 'string'
    || typeof row.coach_id !== 'string'
    || typeof row.student_id !== 'string'
    || (row.program_mode !== 'SINGLE_DAY' && row.program_mode !== 'CYCLE')
    || (row.scheduled_for !== null && typeof row.scheduled_for !== 'string')
    || typeof row.additional_cycle_repeats !== 'number'
    || typeof row.cycle_day_count !== 'number'
    || typeof row.title !== 'string'
    || (row.status !== 'DRAFT' && row.status !== 'PUBLISHED')
    || (row.published_at !== null && typeof row.published_at !== 'string')
    || typeof row.created_at !== 'string'
    || typeof row.updated_at !== 'string'
  ) {
    throw new Error('La asignación de rutina recibida no es válida.');
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    coachId: row.coach_id,
    studentId: row.student_id,
    programMode: row.program_mode,
    scheduledFor: row.scheduled_for,
    additionalCycleRepeats: row.additional_cycle_repeats,
    cycleDayCount: row.cycle_day_count,
    title: row.title,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    days: [...days].sort((first, second) => first.position - second.position),
    items: days.flatMap((day) => day.items).sort((first, second) => (
      first.cycleDayPosition - second.cycleDayPosition || first.position - second.position
    )),
  };
}

export function toRoutineAssignmentItemPayload(item: RoutineAssignmentItemInput) {
  return {
    sourceType: item.source,
    sourceId: item.sourceId,
    prescribedSets: item.prescribedSets,
    prescribedReps: item.prescribedReps,
    targetLoad: item.targetLoad,
    coachInstructions: item.coachInstructions,
    rest: item.rest,
    baseRepetitions: item.baseRepetitions ?? null,
    repetitionsIncrement: item.repetitionsIncrement ?? 0,
    baseLoad: item.baseLoad ?? null,
    loadIncrement: item.loadIncrement ?? 0,
    loadUnit: item.loadUnit ?? null,
  };
}

export function toTrainingProgramPayload(input: SaveTrainingProgramDraftInput) {
  return {
    p_assignment_id: input.assignmentId,
    p_student_id: input.studentId,
    p_program_mode: input.programMode,
    p_scheduled_for: input.scheduledFor,
    p_title: input.title,
    p_additional_cycle_repeats: input.additionalCycleRepeats,
    p_cycle_days: input.days.map((day) => ({
      position: day.position,
      title: day.title,
      items: day.items.map(toRoutineAssignmentItemPayload),
    })),
  };
}
