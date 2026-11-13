export const EXERCISE_FOCUSES = ['GLUTES', 'UPPER_BODY', 'CORE', 'FULL_BODY'] as const;
export type ExerciseFocus = (typeof EXERCISE_FOCUSES)[number];

export const EXERCISE_EQUIPMENT = [
  'DUMBBELLS',
  'BARBELL',
  'MACHINE',
  'CABLE',
  'BANDS',
  'BODYWEIGHT',
  'BENCH',
  'KETTLEBELL',
  'OTHER',
] as const;
export type ExerciseEquipment = (typeof EXERCISE_EQUIPMENT)[number];

export const EXERCISE_MOVEMENT_PATTERNS = [
  'SQUAT',
  'HINGE',
  'HIP_THRUST',
  'LUNGE',
  'ABDUCTION',
  'HORIZONTAL_PUSH',
  'HORIZONTAL_PULL',
  'VERTICAL_PUSH',
  'VERTICAL_PULL',
  'CORE_STABILITY',
  'CARRY',
  'LOCOMOTION',
  'OTHER',
] as const;
export type ExerciseMovementPattern = (typeof EXERCISE_MOVEMENT_PATTERNS)[number];

export const EXERCISE_DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type ExerciseDefinitionDifficulty = (typeof EXERCISE_DIFFICULTIES)[number];

export interface ExerciseDefinition {
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
  sourceCatalogExerciseId: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface ExerciseDefinitionInput {
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

const isOneOf = <T extends readonly string[]>(value: unknown, options: T): value is T[number] => (
  typeof value === 'string' && options.some((option) => option === value)
);

const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every((item) => typeof item === 'string')
);

export function toExerciseDefinition(value: unknown): ExerciseDefinition {
  if (!value || typeof value !== 'object') {
    throw new Error('El ejercicio recibido no es válido.');
  }

  const row = value as Record<string, unknown>;
  const id = row.id;
  const name = row.name;
  const focus = row.focus;
  const primaryMuscles = row.primary_muscles;
  const secondaryMuscles = row.secondary_muscles;
  const equipment = row.equipment;
  const movementPattern = row.movement_pattern;
  const difficulty = row.difficulty;
  const instructions = row.instructions;
  const tips = row.tips;
  const videoUrl = row.video_url;
  const sourceCatalogExerciseId = row.source_catalog_exercise_id ?? null;
  const createdAt = row.created_at;
  const archivedAt = row.archived_at ?? null;

  if (
    typeof id !== 'string'
    || typeof name !== 'string'
    || !isOneOf(focus, EXERCISE_FOCUSES)
    || !isStringArray(primaryMuscles)
    || !isStringArray(secondaryMuscles)
    || !Array.isArray(equipment)
    || !equipment.every((item) => isOneOf(item, EXERCISE_EQUIPMENT))
    || !isOneOf(movementPattern, EXERCISE_MOVEMENT_PATTERNS)
    || !isOneOf(difficulty, EXERCISE_DIFFICULTIES)
    || typeof instructions !== 'string'
    || typeof tips !== 'string'
    || (videoUrl !== null && typeof videoUrl !== 'string')
    || (sourceCatalogExerciseId !== null && typeof sourceCatalogExerciseId !== 'string')
    || typeof createdAt !== 'string'
    || (archivedAt !== null && typeof archivedAt !== 'string')
  ) {
    throw new Error('El ejercicio recibido no es válido.');
  }

  return {
    id,
    name,
    focus,
    primaryMuscles,
    secondaryMuscles,
    equipment,
    movementPattern,
    difficulty,
    instructions,
    tips,
    videoUrl,
    sourceCatalogExerciseId,
    createdAt,
    archivedAt,
  };
}

export function toExerciseDefinitionInput(value: ExerciseDefinition): ExerciseDefinitionInput {
  return {
    name: value.name,
    focus: value.focus,
    primaryMuscles: [...value.primaryMuscles],
    secondaryMuscles: [...value.secondaryMuscles],
    equipment: [...value.equipment],
    movementPattern: value.movementPattern,
    difficulty: value.difficulty,
    instructions: value.instructions,
    tips: value.tips,
    videoUrl: value.videoUrl,
  };
}

export const exerciseFocusLabels: Record<ExerciseFocus, string> = {
  GLUTES: 'Glúteos',
  UPPER_BODY: 'Tren superior',
  CORE: 'Core',
  FULL_BODY: 'Cuerpo completo',
};

export const exerciseEquipmentLabels: Record<ExerciseEquipment, string> = {
  DUMBBELLS: 'Mancuernas',
  BARBELL: 'Barra',
  MACHINE: 'Máquina',
  CABLE: 'Polea',
  BANDS: 'Bandas',
  BODYWEIGHT: 'Peso corporal',
  BENCH: 'Banco',
  KETTLEBELL: 'Kettlebell',
  OTHER: 'Otro',
};

export const exerciseMovementLabels: Record<ExerciseMovementPattern, string> = {
  SQUAT: 'Sentadilla',
  HINGE: 'Bisagra de cadera',
  HIP_THRUST: 'Extensión de cadera',
  LUNGE: 'Zancada',
  ABDUCTION: 'Abducción',
  HORIZONTAL_PUSH: 'Empuje horizontal',
  HORIZONTAL_PULL: 'Tracción horizontal',
  VERTICAL_PUSH: 'Empuje vertical',
  VERTICAL_PULL: 'Tracción vertical',
  CORE_STABILITY: 'Estabilidad del core',
  CARRY: 'Transporte',
  LOCOMOTION: 'Locomoción',
  OTHER: 'Otro patrón',
};

export const exerciseDifficultyLabels: Record<ExerciseDefinitionDifficulty, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

const muscleLabels: Record<string, string> = {
  'anterior deltoid': 'Deltoides anterior',
  deltoid: 'Deltoides',
  biceps: 'Bíceps',
  calves: 'Pantorrillas',
  core: 'Core',
  'erector spinae': 'Erectores espinales',
  forearms: 'Antebrazos',
  'gluteus maximus': 'Glúteo mayor',
  'gluteus medius': 'Glúteo medio',
  'gluteus minimus': 'Glúteo menor',
  hamstrings: 'Isquiotibiales',
  'hip flexors': 'Flexores de cadera',
  'latissimus dorsi': 'Dorsal ancho',
  obliques: 'Oblicuos',
  'pectoralis major': 'Pectoral mayor',
  quadriceps: 'Cuádriceps',
  'middle trapezius': 'Trapecio medio',
  'upper trapezius': 'Trapecio superior',
  triceps: 'Tríceps',
};

export function formatMuscleName(muscle: string): string {
  return muscleLabels[muscle.toLocaleLowerCase()] ?? muscle;
}