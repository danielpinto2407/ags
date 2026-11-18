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
  ActualSetPerformance,
  ActualExercisePerformance,
  CoachRoutineExecutionReview,
  CoachRoutineExecutionSummary,
  CycleSlotHistory,
  StudentRoutineHistoryEntry,
  StudentRoutineExecutionSnapshot,
} from '@/domain/workoutExecution';
import {
  calculateRoutineProgress,
  calculateSetProgress,
  createEmptyExercisePerformance,
  getCompletedExerciseCount,
  getCompletedSetCount,
} from '@/domain/workoutExecution';
import { calculateCycleExerciseTarget, getCompletedCycleSlotRuns } from '@/domain/trainingCycle';

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

async function listExecutionHistory(
  studentId: string,
  tenantId: string,
  limit: number,
  errorMessage: string,
  coachId?: string
): Promise<StudentRoutineHistoryEntry[]> {
  const client = requireClient();
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const { data: executionRows, error: executionError } = await client
    .from('routine_executions')
    .select('id, assignment_id, cycle_day_id, execution_date, slot_attempt, status, started_at')
    .eq('tenant_id', tenantId)
    .eq('student_id', studentId)
    .order('execution_date', { ascending: false })
    .order('started_at', { ascending: false })
    .limit(safeLimit);

  if (executionError) throw new Error(errorMessage);
  if (!executionRows?.length) return [];

  const assignmentIds = [...new Set(executionRows.map(({ assignment_id }) => assignment_id))];
  const cycleDayIds = [...new Set(executionRows.map(({ cycle_day_id }) => cycle_day_id))];
  const executionIds = executionRows.map(({ id }) => id);
  let assignmentQuery = client
    .from('routine_assignments')
    .select('id, title, program_mode')
    .eq('tenant_id', tenantId)
    .eq('student_id', studentId)
    .in('id', assignmentIds);
  if (coachId) {
    assignmentQuery = assignmentQuery.eq('coach_id', coachId).eq('status', 'PUBLISHED');
  }

  const [assignmentResult, dayResult, itemResult, performanceResult, setResult] = await Promise.all([
    assignmentQuery,
    client
      .from('routine_assignment_days')
      .select('id, title')
      .eq('tenant_id', tenantId)
      .in('id', cycleDayIds),
    client
      .from('routine_assignment_items')
      .select('id, cycle_day_id, prescribed_sets')
      .eq('tenant_id', tenantId)
      .in('cycle_day_id', cycleDayIds),
    client
      .from('routine_execution_exercises')
      .select('execution_id, routine_item_id, completed')
      .eq('tenant_id', tenantId)
      .in('execution_id', executionIds),
    client
      .from('routine_execution_sets')
      .select('execution_id, routine_item_id, completed')
      .eq('tenant_id', tenantId)
      .in('execution_id', executionIds),
  ]);

  if (assignmentResult.error || dayResult.error || itemResult.error || performanceResult.error || setResult.error) {
    throw new Error(errorMessage);
  }

  const assignmentsById = new Map((assignmentResult.data ?? []).map((assignment) => [assignment.id, assignment]));
  const daysById = new Map((dayResult.data ?? []).map((day) => [day.id, day]));
  const completedCountsByExercise = new Map<string, number>();
  const hasSeriesByExecution = new Set<string>();
  const prescribedSetsByDay = new Map<string, number>();
  const prescribedSetsByExercise = new Map<string, number>();
  for (const item of itemResult.data ?? []) {
    prescribedSetsByExercise.set(item.id, item.prescribed_sets);
    prescribedSetsByDay.set(
      item.cycle_day_id,
      (prescribedSetsByDay.get(item.cycle_day_id) ?? 0) + item.prescribed_sets
    );
  }
  for (const performance of performanceResult.data ?? []) {
    if (performance.completed) {
      const key = `${performance.execution_id}:${performance.routine_item_id}`;
      completedCountsByExercise.set(key, (completedCountsByExercise.get(key) ?? 0) + 1);
    }
  }
  const completedSetsByExecution = new Map<string, number>();
  const completedSetsByExecutionAndExercise = new Map<string, number>();
  for (const set of setResult.data ?? []) {
    hasSeriesByExecution.add(set.execution_id);
    const key = `${set.execution_id}:${set.routine_item_id}`;
    if (set.completed) {
      completedSetsByExecution.set(
        set.execution_id,
        (completedSetsByExecution.get(set.execution_id) ?? 0) + 1
      );
      completedSetsByExecutionAndExercise.set(key, (completedSetsByExecutionAndExercise.get(key) ?? 0) + 1);
    }
  }

  return executionRows.map((execution) => {
    const assignment = assignmentsById.get(execution.assignment_id);
    const cycleDay = daysById.get(execution.cycle_day_id);
    if (!assignment || !cycleDay) throw new Error('Una sesión del historial ya no está disponible.');

    const itemsForDay = (itemResult.data ?? []).filter(({ cycle_day_id }) => cycle_day_id === execution.cycle_day_id);
    const prescribedExercises = itemsForDay.length;
    const completedExercises = itemsForDay.filter(({ id }) => {
      const key = `${execution.id}:${id}`;
      const completedSeries = completedSetsByExecutionAndExercise.get(key);
      return hasSeriesByExecution.has(execution.id)
        ? completedSeries === prescribedSetsByExercise.get(id)
        : completedCountsByExercise.has(key);
    }).length;
    const hasSeriesRecords = hasSeriesByExecution.has(execution.id);
    const completedUnits = hasSeriesRecords
      ? completedSetsByExecution.get(execution.id) ?? 0
      : completedExercises;
    const prescribedUnits = hasSeriesRecords
      ? prescribedSetsByDay.get(execution.cycle_day_id) ?? 0
      : prescribedExercises;
    const progressUnit = hasSeriesRecords ? 'sets' as const : 'exercises' as const;
    return {
      id: execution.id,
      title: assignment.title,
      programMode: assignment.program_mode,
      executionDate: execution.execution_date,
      cycleDayTitle: assignment.program_mode === 'CYCLE' ? cycleDay.title : null,
      slotAttempt: execution.slot_attempt,
      status: execution.status,
      completedExercises,
      prescribedExercises,
      completedUnits,
      prescribedUnits,
      progressUnit,
      progressPercent: prescribedUnits > 0
        ? progressUnit === 'sets'
          ? calculateSetProgress(completedUnits, prescribedUnits)
          : calculateRoutineProgress(completedUnits, prescribedUnits)
        : 0,
    };
  });
}

function assignmentError(error: { message: string }): Error {
  const messages: Record<string, string> = {
    assignment_date_taken: 'Ya existe una rutina para esta alumna en esa fecha.',
    assignment_not_draft: 'Esta rutina ya fue publicada y no se puede editar.',
    assignment_not_owned: 'No puedes modificar una rutina que no asignaste.',
    assignment_has_no_exercises: 'Completa cada día con al menos un ejercicio antes de publicar.',
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

    const [setResult, performanceResult] = await Promise.all([
      client
        .from('routine_execution_sets')
        .select('routine_item_id, set_number, completed, actual_repetitions, actual_load, load_unit, rir, rpe_percent')
        .eq('tenant_id', tenantId)
        .eq('execution_id', execution.id)
        .order('set_number'),
      client
        .from('routine_execution_exercises')
        .select('routine_item_id, completed, actual_repetitions, actual_load, load_unit, rir, rpe_percent')
        .eq('tenant_id', tenantId)
        .eq('execution_id', execution.id),
    ]);
    if (setResult.error || performanceResult.error) throw new Error('No se pudieron cargar las series registradas.');

    const assignment = assignments.find(({ id }) => id === execution.assignment_id);
    const day = assignment?.days.find(({ id }) => id === execution.cycle_day_id);
    if (!assignment || !day) throw new Error('La ejecución apunta a un programa que ya no está disponible.');

    const setsByItemId = new Map<string, ActualSetPerformance[]>();
    for (const row of setResult.data ?? []) {
      const sets = setsByItemId.get(row.routine_item_id) ?? [];
      sets.push({
        setNumber: row.set_number,
        completed: row.completed,
        actualRepetitions: row.actual_repetitions,
        actualLoad: row.actual_load,
        loadUnit: row.load_unit,
        rir: row.rir,
        rpePercent: row.rpe_percent,
      });
      setsByItemId.set(row.routine_item_id, sets);
    }
    const legacyByItemId = new Map((performanceResult.data ?? []).map((row) => [row.routine_item_id, {
      completed: row.completed,
      actualRepetitions: row.actual_repetitions,
      actualLoad: row.actual_load,
      loadUnit: row.load_unit,
      rir: row.rir,
      rpePercent: row.rpe_percent,
    }]));
    const performances: Record<string, ActualExercisePerformance> = {};
    for (const item of day.items) {
      const series = setsByItemId.get(item.id);
      const empty = createEmptyExercisePerformance(item.id, item.prescribedSets);
      performances[item.id] = {
        ...empty,
        sets: series?.length
          ? empty.sets.map((set) => series.find(({ setNumber }) => setNumber === set.setNumber) ?? set)
          : empty.sets,
        legacyRecord: legacyByItemId.get(item.id) ?? null,
      };
    }

    const prescribedExercises = day.items.length;
    const completedExercises = getCompletedExerciseCount(Object.values(performances));
    const hasSeriesRecords = (setResult.data ?? []).length > 0;
    const prescribedSets = day.items.reduce((total, item) => total + item.prescribedSets, 0);
    const completedSets = getCompletedSetCount(Object.values(performances));
    const progressUnit = hasSeriesRecords ? 'sets' as const : 'exercises' as const;
    const completedUnits = hasSeriesRecords ? completedSets : completedExercises;
    const prescribedUnits = hasSeriesRecords ? prescribedSets : prescribedExercises;

    return {
      id: execution.id,
      assignmentId: execution.assignment_id,
      cycleDayId: execution.cycle_day_id,
      executionDate: execution.execution_date,
      status: execution.status,
      slotAttempt: execution.slot_attempt,
      progressPercent: prescribedUnits === 0
        ? 0
        : progressUnit === 'sets'
          ? calculateSetProgress(completedUnits, prescribedUnits)
          : calculateRoutineProgress(completedUnits, prescribedUnits),
      completedExercises,
      prescribedExercises,
      completedSets,
      prescribedSets,
      progressUnit,
      performances,
    };
  },

  async getExecutionDatesForStudent(
    studentId: string,
    tenantId: string,
    firstDate: string,
    lastDate: string
  ): Promise<string[]> {
    const { data, error } = await requireClient()
      .from('routine_executions')
      .select('execution_date')
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .gte('execution_date', firstDate)
      .lte('execution_date', lastDate)
      .order('execution_date');

    if (error) throw new Error('No se pudo cargar el calendario de entrenamientos.');
    return [...new Set((data ?? []).map(({ execution_date }) => execution_date))];
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
      const current = history[row.cycle_day_id] ?? { attemptCount: 0, terminalAttemptCount: 0, completedRuns: 0 };
      current.attemptCount += 1;
      if (row.status !== 'IN_PROGRESS') current.terminalAttemptCount += 1;
      if (row.status === 'COMPLETED') current.completedRuns += 1;
      history[row.cycle_day_id] = current;
    }
    return history;
  },

  async listRecentHistory(studentId: string, tenantId: string, limit = 30): Promise<StudentRoutineHistoryEntry[]> {
    return listExecutionHistory(
      studentId,
      tenantId,
      limit,
      'No se pudo cargar tu historial de entrenamientos.'
    );
  },

  async listCoachStudentExecutionHistory(
    studentId: string,
    tenantId: string,
    coachId: string,
    limit = 30
  ): Promise<CoachRoutineExecutionSummary[]> {
    return listExecutionHistory(
      studentId,
      tenantId,
      limit,
      'No se pudo cargar el historial de entrenamientos de esta alumna.',
      coachId
    );
  },

  async getCoachStudentExecutionReview(
    studentId: string,
    tenantId: string,
    coachId: string,
    executionId: string
  ): Promise<CoachRoutineExecutionReview | null> {
    const client = requireClient();
    const { data: execution, error: executionError } = await client
      .from('routine_executions')
      .select('id, assignment_id, cycle_day_id, execution_date, slot_attempt, status')
      .eq('id', executionId)
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (executionError) throw new Error('No se pudo cargar este entrenamiento.');
    if (!execution) return null;

    const { data: assignmentRow, error: assignmentError } = await client
      .from('routine_assignments')
      .select(ASSIGNMENT_COLUMNS)
      .eq('id', execution.assignment_id)
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .eq('coach_id', coachId)
      .eq('status', 'PUBLISHED')
      .maybeSingle();

    if (assignmentError) throw new Error('No se pudo cargar la rutina de este entrenamiento.');
    if (!assignmentRow) return null;

    const [assignment] = await mapAssignments([assignmentRow]);
    const day = assignment?.days.find(({ id }) => id === execution.cycle_day_id);
    if (!assignment || !day) throw new Error('El entrenamiento ya no tiene una rutina disponible.');

    const [setResult, performanceResult, earlierAttemptsResult] = await Promise.all([
      client
        .from('routine_execution_sets')
        .select('routine_item_id, set_number, completed, actual_repetitions, actual_load, load_unit, rir, rpe_percent')
        .eq('tenant_id', tenantId)
        .eq('execution_id', execution.id)
        .order('routine_item_id')
        .order('set_number'),
      client
        .from('routine_execution_exercises')
        .select('routine_item_id, completed, actual_repetitions, actual_load, load_unit, rir, rpe_percent')
        .eq('tenant_id', tenantId)
        .eq('execution_id', execution.id),
      assignment.programMode === 'CYCLE' && execution.slot_attempt !== null
        ? client
          .from('routine_executions')
          .select('slot_attempt, status')
          .eq('tenant_id', tenantId)
          .eq('assignment_id', assignment.id)
          .eq('cycle_day_id', execution.cycle_day_id)
          .lt('slot_attempt', execution.slot_attempt)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (setResult.error || performanceResult.error || earlierAttemptsResult.error) {
      throw new Error('No se pudieron cargar los ejercicios registrados.');
    }

    const setsByItemId = new Map<string, ActualSetPerformance[]>();
    for (const row of setResult.data ?? []) {
      const sets = setsByItemId.get(row.routine_item_id) ?? [];
      sets.push({
        setNumber: row.set_number,
        completed: row.completed,
        actualRepetitions: row.actual_repetitions,
        actualLoad: row.actual_load,
        loadUnit: row.load_unit,
        rir: row.rir,
        rpePercent: row.rpe_percent,
      });
      setsByItemId.set(row.routine_item_id, sets);
    }
    const legacyByItemId = new Map(
      (performanceResult.data ?? []).map((performance) => [performance.routine_item_id, performance])
    );
    const completedRuns = getCompletedCycleSlotRuns(
      (earlierAttemptsResult.data ?? [])
        .filter(({ status }) => status === 'COMPLETED' || status === 'CLOSED_INCOMPLETE')
        .map(({ status }) => status as 'COMPLETED' | 'CLOSED_INCOMPLETE')
    );
    const exercises = day.items.map((item) => {
      const series = setsByItemId.get(item.id) ?? [];
      const legacy = legacyByItemId.get(item.id);
      const progressionTarget = assignment.programMode === 'CYCLE' && item.baseRepetitions !== null
        ? calculateCycleExerciseTarget({
          exerciseItemId: item.id,
          baseRepetitions: item.baseRepetitions,
          repetitionsIncrement: item.repetitionsIncrement,
          baseLoad: item.baseLoad,
          loadIncrement: item.loadIncrement,
          loadUnit: item.loadUnit,
        }, completedRuns)
        : null;

      return {
        id: item.id,
        position: item.position,
        name: item.exercise.name,
        prescribedSets: item.prescribedSets,
        prescribedRepetitions: progressionTarget
          ? String(progressionTarget.repetitions)
          : item.prescribedReps,
        prescribedLoad: progressionTarget
          ? progressionTarget.load === null ? null : `${progressionTarget.load} ${progressionTarget.loadUnit}`
          : item.targetLoad.trim() || null,
        sets: series,
        legacyRecord: legacy ? {
          completed: legacy.completed,
          actualRepetitions: legacy.actual_repetitions,
          actualLoad: legacy.actual_load,
          loadUnit: legacy.load_unit,
          rir: legacy.rir,
          rpePercent: legacy.rpe_percent,
        } : null,
      };
    });

    const prescribedExercises = exercises.length;
    const completedExercises = exercises.filter(({ sets, legacyRecord, prescribedSets }) => (
      sets.length
        ? sets.filter(({ completed }) => completed).length === prescribedSets
        : Boolean(legacyRecord?.completed)
    )).length;
    const prescribedSets = exercises.reduce((total, exercise) => total + exercise.prescribedSets, 0);
    const completedSets = exercises.reduce((total, exercise) => (
      total + exercise.sets.filter(({ completed }) => completed).length
    ), 0);
    const hasSeriesRecords = (setResult.data ?? []).length > 0;
    const progressUnit = hasSeriesRecords ? 'sets' as const : 'exercises' as const;
    const completedUnits = hasSeriesRecords ? completedSets : completedExercises;
    const prescribedUnits = hasSeriesRecords ? prescribedSets : prescribedExercises;
    return {
      id: execution.id,
      title: assignment.title,
      programMode: assignment.programMode,
      executionDate: execution.execution_date,
      cycleDayTitle: assignment.programMode === 'CYCLE' ? day.title : null,
      slotAttempt: execution.slot_attempt,
      status: execution.status,
      completedExercises,
      prescribedExercises,
      completedUnits,
      prescribedUnits,
      progressUnit,
      progressPercent: prescribedUnits > 0
        ? progressUnit === 'sets'
          ? calculateSetProgress(completedUnits, prescribedUnits)
          : calculateRoutineProgress(completedUnits, prescribedUnits)
        : 0,
      exercises,
    };
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
    performance: ActualExercisePerformance,
    executionId: string | null
  ): Promise<{ executionId: string; status: string; progressPercent: number }> {
    const { data, error } = await requireClient().rpc('save_routine_exercise_performance_v2', {
      p_assignment_id: assignmentId,
      p_cycle_day_position: cycleDayPosition,
      p_routine_item_id: performance.routineItemId,
      p_execution_id: executionId,
      p_sets: performance.sets,
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
    first_completed_set_required: 'Marca una serie como realizada para comenzar tu entrenamiento.',
    daily_execution_limit: 'Ya registraste un entrenamiento hoy. Podrás iniciar otro mañana.',
    single_day_program_takes_precedence: 'Ya tienes un entrenamiento asignado para este día.',
    cycle_slot_attempts_exhausted: 'Ya completaste las veces disponibles para este día.',
    cycle_iteration_not_ready: 'Este día estará disponible cuando termines los demás entrenamientos de esta vuelta.',
    completed_set_cannot_uncheck: 'No puedes desmarcar una serie ya realizada en un entrenamiento cerrado.',
    invalid_actual_performance: 'Revisa las repeticiones, carga y esfuerzo que registraste.',
    completed_set_requires_repetitions: 'Registra las repeticiones realizadas para completar la serie.',
    completed_weighted_set_requires_load: 'Registra la carga utilizada para completar la serie.',
    completed_set_requires_effort: 'Registra el RIR y RPE de cada serie realizada.',
  };
  const message = Object.entries(messages).find(([code]) => error.message.includes(code))?.[1];
  return new Error(message ?? 'No se pudo guardar tu ejecución. Inténtalo nuevamente.');
}
