import type { WorkoutComment } from '@/domain/workoutExecution';
import { requireRoutineClient } from '@/data/routineAssignmentData';

export async function mapWorkoutComments(rows: Array<Record<string, unknown>>): Promise<WorkoutComment[]> {
  return rows.map((row) => ({
    id: String(row.id),
    executionId: String(row.execution_id),
    authorId: String(row.author_id),
    authorName: String(row.author_name || 'Usuario'),
    body: String(row.body),
    createdAt: String(row.created_at),
  }));
}

export const workoutCommentService = {
  async list(executionId: string, tenantId: string): Promise<WorkoutComment[]> {
    const { data, error } = await requireRoutineClient()
      .from('routine_execution_comments')
      .select('id, execution_id, author_id, author_name, body, created_at')
      .eq('tenant_id', tenantId)
      .eq('execution_id', executionId)
      .order('created_at', { ascending: true });

    if (error) throw new Error('No se pudieron cargar los comentarios del entrenamiento.');
    return mapWorkoutComments(data ?? []);
  },

  async create(executionId: string, tenantId: string, body: string): Promise<WorkoutComment> {
    const normalizedBody = body.trim();
    if (!normalizedBody) throw new Error('Escribe un comentario antes de enviarlo.');
    if (normalizedBody.length > 2000) throw new Error('El comentario no puede superar 2000 caracteres.');

    const client = requireRoutineClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw new Error('No se pudo identificar al autor del comentario.');

    const { data, error } = await client
      .from('routine_execution_comments')
      .insert({ tenant_id: tenantId, execution_id: executionId, author_id: userData.user.id, body: normalizedBody })
      .select('id, execution_id, author_id, author_name, body, created_at')
      .single();

    if (error) throw new Error('No se pudo publicar el comentario.');
    const [comment] = await mapWorkoutComments([data]);
    return comment;
  },
};
