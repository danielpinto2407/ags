import { supabaseClient } from '@/data/supabase/client';
import {
  toRoutineAssignment,
  toRoutineAssignmentItem,
  toRoutineAssignmentItemPayload,
} from '@/domain/routineAssignment';
import type { RoutineAssignment, SaveRoutineAssignmentDraftInput } from '@/domain/routineAssignment';

const ASSIGNMENT_COLUMNS = [
  'id',
  'tenant_id',
  'coach_id',
  'student_id',
  'scheduled_for',
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
  'position',
  'catalog_exercise_id',
  'tenant_exercise_id',
  'exercise_snapshot',
  'prescribed_sets',
  'prescribed_reps',
  'target_load',
  'work_duration',
  'rest',
].join(', ');

interface AssignmentItemRow {
  assignment_id: string;
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

  const { data: itemRows, error } = await client
    .from('routine_assignment_items')
    .select(ASSIGNMENT_ITEM_COLUMNS)
    .in('assignment_id', ids)
    .order('position');

  if (error) throw new Error('No se pudieron cargar los ejercicios programados.');

  const itemsByAssignment = new Map<string, ReturnType<typeof toRoutineAssignmentItem>[]>();
  for (const row of itemRows ?? []) {
    const item = toRoutineAssignmentItem(row);
    const assignmentId = (row as unknown as AssignmentItemRow).assignment_id;
    const assignmentItems = itemsByAssignment.get(assignmentId) ?? [];
    assignmentItems.push(item);
    itemsByAssignment.set(assignmentId, assignmentItems);
  }

  return rows.map((row) => {
    const id = (row as Record<string, string>).id;
    return toRoutineAssignment(row, itemsByAssignment.get(id) ?? []);
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
      .eq('scheduled_for', scheduledFor)
      .order('created_at');

    if (error) throw new Error('No se pudieron cargar las rutinas de esta fecha.');
    return mapAssignments(data ?? []);
  },

  async getForStudent(studentId: string, tenantId: string, scheduledFor: string): Promise<RoutineAssignment | null> {
    const client = requireClient();
    const { data, error } = await client
      .from('routine_assignments')
      .select(ASSIGNMENT_COLUMNS)
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId)
      .eq('scheduled_for', scheduledFor)
      .maybeSingle();

    if (error) throw new Error('No se pudo cargar la rutina de esta fecha.');
    if (!data) return null;
    const [assignment] = await mapAssignments([data]);
    return assignment ?? null;
  },

  async saveDraft(input: SaveRoutineAssignmentDraftInput): Promise<string> {
    const { data, error } = await requireClient().rpc('save_routine_assignment_draft', {
      p_assignment_id: input.assignmentId,
      p_student_id: input.studentId,
      p_scheduled_for: input.scheduledFor,
      p_title: input.title,
      p_items: input.items.map(toRoutineAssignmentItemPayload),
    });

    if (error) throw assignmentError(error);
    if (typeof data !== 'string') throw new Error('El servidor no confirmó el borrador.');
    return data;
  },

  async publish(assignmentId: string): Promise<void> {
    const { data, error } = await requireClient().rpc('publish_routine_assignment', {
      p_assignment_id: assignmentId,
    });

    if (error) throw assignmentError(error);
    if (data !== assignmentId) throw new Error('El servidor no confirmó la publicación.');
  },
};
