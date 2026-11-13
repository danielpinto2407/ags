import { supabaseClient } from '@/data/supabase/client';
import {
  toRoutineAssignment,
  toRoutineAssignmentItem,
  toRoutineAssignmentItemPayload,
  toTrainingProgramPayload,
} from '@/domain/routineAssignment';
import type {
  RoutineAssignment,
  RoutineAssignmentDay,
  SaveRoutineAssignmentDraftInput,
  SaveTrainingProgramDraftInput,
} from '@/domain/routineAssignment';
import type {
  ActualExercisePerformance,
  CycleSlotHistory,
  StudentRoutineExecutionSnapshot,
} from '@/domain/workoutExecution';
import { calculateRoutineProgress, getCompletedExerciseCount } from '@/domain/workoutExecution';

const ASSIGNMENT_COLUMNS = [
  'id',
  'tenant_id',
  'coach_id',
  'student_id',
  'program_mode',
  'scheduled_for',
  'additional_cycle_repeats',
  'cycle_day_count',
  'title',
  'status',
  'published_at',
  'created_at',
  'updated_at',
].join(', ');

const ASSIGNMENT_ITEM_COLUMNS = [
  'id',
  'assignment_id',
  'tenant_id',
  'cycle_day_id',
  'position',
  'catalog_exercise_id',
  'tenant_exercise_id',
  'exercise_snapshot',
  'prescribed_sets',
  'prescribed_reps',
  'target_load',
  'coach_instructions',
  'work_duration',
  'rest',
  'base_repetitions',
  'repetitions_increment',
  'base_load',
  'load_increment',
  'load_unit',
].join(', ');

const ASSIGNMENT_DAY_COLUMNS = [
  'id',
  'assignment_id',
  'tenant_id',
  'position',
  'title',
].join(', ');

interface AssignmentItemRow {
  assignment_id: string;
  cycle_day_id: string;
}

interface AssignmentDayRow {
  id: string;
  assignment_id: string;
  position: number;
  title: string;
}

function requireClient() {
  if (!supabaseClient) throw new Error('Supabase no está configurado.');
  return supabaseClient;
}

async function mapAssignments(rows: unknown[]): Promise<RoutineAssignment[]> {
  if (rows.length === 0) return [];
  const client = requireClient();
  const ids = rows.map((value) => {
    if (!value || typeof value !== 'object' || typeof (value as Record<string, unknown>).id !== 'string') {
      throw new Error('La asignación de rutina recibida no es válida.');
    }
    return (value as Record<string, string>).id;
  });

  const [{ data: dayRows, error: dayError }, { data: itemRows, error: itemError }] = await Promise.all([
    client
      .from('routine_assignment_days')
      .select(ASSIGNMENT_DAY_COLUMNS)
      .in('assignment_id', ids)
      .order('position'),
    client
      .from('routine_assignment_items')
      .select(ASSIGNMENT_ITEM_COLUMNS)
      .in('assignment_id', ids)
      .order('position'),
  ]);

  if (dayError || itemError) throw new Error('No se pudieron cargar los ejercicios programados.');

  const daysByAssignment = new Map<string, RoutineAssignmentDay[]>();
  const dayPositionById = new Map<string, number>();
  for (const row of dayRows ?? []) {
    const day = row as unknown as AssignmentDayRow;
    dayPositionById.set(day.id, day.position);
    const assignmentDays = daysByAssignment.get(day.assignment_id) ?? [];
    assignmentDays.push({ id: day.id, position: day.position, title: day.title, items: [] });
    daysByAssignment.set(day.assignment_id, assignmentDays);
  }

  for (const row of itemRows ?? []) {
    const itemRow = row as unknown as AssignmentItemRow;
    const assignmentDays = daysByAssignment.get(itemRow.assignment_id) ?? [];
    const day = assignmentDays.find(({ id }) => id === itemRow.cycle_day_id);
    if (!day) throw new Error('El ejercicio apunta a un día de programa inexistente.');
    day.items.push(toRoutineAssignmentItem({
      ...(row as unknown as Record<string, unknown>),
      cycle_day_position: dayPositionById.get(itemRow.cycle_day_id),
    }));
  }

  return rows.map((row) => {
    const id = (row as Record<string, string>).id;
    return toRoutineAssignment(row, daysByAssignment.get(id) ?? []);
  });
}

function assignmentError(error: { message: string }): Error {
  const messages: Record<string, string> = {
    assignment_date_taken: 'Ya existe una rutina para esta alumna en esa fecha.',
    assignment_not_draft: 'Esta rutina ya fue publicada y no se puede editar.',
    assignment_not_owned: 'No puedes modificar una rutina que no asignaste.',
    assignment_has_no_exercises: 'Agrega al menos un ejercicio antes de publicar.',
    student_not_active_or_owned: 'Selecciona una alumna activa que tú hayas invitado.',
    routine_exercise_unavailable: 'Uno de los ejercicios ya no está disponible en la biblioteca.',
    invalid_assignment_input: 'Revisa la fecha, el título y los ejercicios de la rutina.',
    invalid_training_program_input: 'Revisa el modo, la fecha y la configuración del programa.',
    invalid_training_program_day: 'Verifica el orden y el nombre de cada día del programa.',
    program_day_count_mismatch: 'El programa debe incluir todos sus días antes de publicarse.',
    cycle_progression_incomplete: 'Completa repeticiones, incrementos y unidad de carga en cada ejercicio del ciclo.',
  };
  const message = Object.entries(messages).find(([code]) => error.message.includes(code))?.[1];
  return new Error(message ?? 'No se pudo guardar la programación. Inténtalo nuevamente.');
}

export const routineAssignmentRepository = {
  async listForCoach(tenantId: string, coachId: string, scheduledFor: string): Promise<RoutineAssignment[]> {
    const client = requireClient();
    const { data, error } = await client
      .from('routine_assignments')
      .select(ASSIGNMENT_COLUMNS)
      .eq('tenant_id', tenantId)
      .eq('coach_id', coachId)
      .or(`and(program_mode.eq.SINGLE_DAY,scheduled_for.eq.${scheduledFor}),program_mode.eq.CYCLE`)
      .order('created_at');

    if (error) throw new Error('No se pudieron cargar las rutinas de esta fecha.');
    return mapAssignments(data ?? []);
  },

  async getForStudent(studentId: string, tenantId: string, scheduledFor: string): Promise<RoutineAssignment[]> {
    const client = requireClient();
    const { error: closeError } = await client.rpc('close_expired_routine_executions');
    if (closeError) throw new Error('No se pudo cerrar el entrenamiento del día anterior.');

    const { data, error } = await client
      .from('routine_assignments')
      .select(ASSIGNMENT_COLUMNS)
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .eq('status', 'PUBLISHED')
      .or(`and(program_mode.eq.SINGLE_DAY,scheduled_for.eq.${scheduledFor}),program_mode.eq.CYCLE`)
      .order('created_at');

    if (error) throw new Error('No se pudo cargar la rutina de esta fecha.');
    return mapAssignments(data ?? []);
  },

  async getExecutionForStudent(
    studentId: string,
    tenantId: string,
    executionDate: string,
    assignments: RoutineAssignment[]
  ): Promise<StudentRoutineExecutionSnapshot | null> {
    const client = requireClient();
    const { data: execution, error: executionError } = await client
      .from('routine_executions')
      .select('id, assignment_id, cycle_day_id, execution_date, status, slot_attempt')
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .eq('execution_date', executionDate)
      .maybeSingle();

    if (executionError) throw new Error('No se pudo cargar el progreso de hoy.');
    if (!execution) return null;

    const { data: performanceRows, error: performanceError } = await client
      .from('routine_execution_exercises')
      .select('routine_item_id, completed, actual_repetitions, actual_load, load_unit, rir, rpe_percent')
      .eq('execution_id', execution.id);
    if (performanceError) throw new Error('No se pudieron cargar los ejercicios registrados.');

    const assignment = assignments.find(({ id }) => id === execution.assignment_id);
    const day = assignment?.days.find(({ id }) => id === execution.cycle_day_id);
    if (!assignment || !day) throw new Error('La ejecución apunta a un programa que ya no está disponible.');

    const performances: Record<string, ActualExercisePerformance> = {};
    for (const item of day.items) {
      performances[item.id] = {
        routineItemId: item.id,
        completed: false,
        actualRepetitions: null,
        actualLoad: null,
        loadUnit: null,
        rir: null,
        rpePercent: null,
      };
    }
    for (const row of performanceRows ?? []) {
      const itemPerformance = performances[row.routine_item_id];
      if (!itemPerformance) continue;
      itemPerformance.completed = row.completed;
      itemPerformance.actualRepetitions = row.actual_repetitions;
      itemPerformance.actualLoad = row.actual_load;
      itemPerformance.loadUnit = row.load_unit;
      itemPerformance.rir = row.rir;
      itemPerformance.rpePercent = row.rpe_percent;
    }

    const prescribedExercises = day.items.length;
    const completedExercises = getCompletedExerciseCount(Object.values(performances));

    return {
      id: execution.id,
      assignmentId: execution.assignment_id,
      cycleDayId: execution.cycle_day_id,
      executionDate: execution.execution_date,
      status: execution.status,
      slotAttempt: execution.slot_attempt,
      progressPercent: prescribedExercises === 0 ? 0 : calculateRoutineProgress(completedExercises, prescribedExercises),
      completedExercises,
      prescribedExercises,
      performances,
    };
  },

  async getCycleSlotHistory(
    studentId: string,
    tenantId: string,
    assignments: RoutineAssignment[]
  ): Promise<Record<string, CycleSlotHistory>> {
    const cycleAssignments = assignments.filter(({ programMode }) => programMode === 'CYCLE');
    if (cycleAssignments.length === 0) return {};

    const { data, error } = await requireClient()
      .from('routine_executions')
      .select('cycle_day_id, status, slot_attempt')
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .in('assignment_id', cycleAssignments.map(({ id }) => id));

    if (error) throw new Error('No se pudo cargar el historial del ciclo.');
    const history: Record<string, CycleSlotHistory> = {};
    for (const row of data ?? []) {
      const current = history[row.cycle_day_id] ?? { attemptCount: 0, completedRuns: 0 };
      current.attemptCount += 1;
      if (row.status === 'COMPLETED') current.completedRuns += 1;
      history[row.cycle_day_id] = current;
    }
    return history;
  },

  async saveTrainingProgramDraft(input: SaveTrainingProgramDraftInput): Promise<string> {
    const { data, error } = await requireClient().rpc(
      'save_training_program_draft',
      toTrainingProgramPayload(input)
    );

    if (error) throw assignmentError(error);
    if (typeof data !== 'string') throw new Error('El servidor no confirmó el borrador.');
    return data;
  },

  async saveDraft(input: SaveRoutineAssignmentDraftInput): Promise<string> {
    const { data, error } = await requireClient().rpc('save_routine_assignment_draft', {
      p_assignment_id: input.assignmentId,
      p_student_id: input.studentId,
      p_scheduled_for: input.scheduledFor,
      p_title: input.title,
      p_items: input.items.map((item) => {
        const { coachInstructions, ...payload } = toRoutineAssignmentItemPayload(item);
        return { ...payload, workDuration: coachInstructions };
      }),
    });

    if (error) throw assignmentError(error);
    if (typeof data !== 'string') throw new Error('El servidor no confirmó el borrador.');
    return data;
  },

  async publish(assignmentId: string): Promise<void> {
    const { data, error } = await requireClient().rpc('publish_training_program', {
      p_assignment_id: assignmentId,
    });

    if (error) throw assignmentError(error);
    if (data !== assignmentId) throw new Error('El servidor no confirmó la publicación.');
  },

  async savePerformance(
    assignmentId: string,
    cycleDayPosition: number,
    performance: ActualExercisePerformance
  ): Promise<{ executionId: string; status: string; progressPercent: number }> {
    const { data, error } = await requireClient().rpc('save_routine_exercise_performance', {
      p_assignment_id: assignmentId,
      p_cycle_day_position: cycleDayPosition,
      p_routine_item_id: performance.routineItemId,
      p_completed: performance.completed,
      p_actual_repetitions: performance.actualRepetitions,
      p_actual_load: performance.actualLoad,
      p_load_unit: performance.loadUnit,
      p_rir: performance.rir,
      p_rpe_percent: performance.rpePercent,
    });

    if (error) throw executionError(error);
    if (!data || typeof data !== 'object') throw new Error('El servidor no confirmó el registro.');
    const result = data as Record<string, unknown>;
    if (typeof result.executionId !== 'string' || typeof result.status !== 'string' || typeof result.progressPercent !== 'number') {
      throw new Error('La respuesta del registro de entrenamiento no es válida.');
    }
    return {
      executionId: result.executionId,
      status: result.status,
      progressPercent: result.progressPercent,
    };
  },
};

function executionError(error: { message: string }): Error {
  const messages: Record<string, string> = {
    first_completed_exercise_required: 'Marca al menos un ejercicio completo para iniciar la rutina.',
    daily_execution_limit: 'Ya iniciaste una rutina hoy. Podrás comenzar otra mañana.',
    single_day_program_takes_precedence: 'Hoy tienes una rutina asignada para esta fecha.',
    cycle_slot_attempts_exhausted: 'Ya completaste los intentos disponibles de este día del ciclo.',
    execution_not_editable: 'Esta ejecución está cerrada y solo se puede consultar.',
    invalid_actual_performance: 'Revisa los valores registrados del ejercicio y su esfuerzo.',
    completed_exercise_requires_repetitions: 'Captura las repeticiones realizadas para completar el ejercicio.',
    completed_weighted_exercise_requires_load: 'Captura el peso utilizado para completar el ejercicio.',
  };
  const message = Object.entries(messages).find(([code]) => error.message.includes(code))?.[1];
  return new Error(message ?? 'No se pudo guardar tu ejecución. Inténtalo nuevamente.');
}
