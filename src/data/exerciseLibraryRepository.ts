import { supabaseClient } from '@/data/supabase/client';
import { toExerciseDefinition } from '@/domain/exerciseDefinition';
import type { ExerciseDefinition, ExerciseDefinitionInput } from '@/domain/exerciseDefinition';

const CATALOG_COLUMNS = [
  'id',
  'name',
  'focus',
  'primary_muscles',
  'secondary_muscles',
  'equipment',
  'movement_pattern',
  'difficulty',
  'instructions',
  'tips',
  'video_url',
  'created_at',
  'archived_at',
].join(', ');

const TENANT_EXERCISE_COLUMNS = [
  'id',
  'name',
  'focus',
  'primary_muscles',
  'secondary_muscles',
  'equipment',
  'movement_pattern',
  'difficulty',
  'instructions',
  'tips',
  'video_url',
  'source_catalog_exercise_id',
  'created_at',
  'archived_at',
].join(', ');

const toDatabaseInput = (input: ExerciseDefinitionInput) => ({
  name: input.name.trim(),
  focus: input.focus,
  primary_muscles: input.primaryMuscles,
  secondary_muscles: input.secondaryMuscles,
  equipment: input.equipment,
  movement_pattern: input.movementPattern,
  difficulty: input.difficulty,
  instructions: input.instructions.trim(),
  tips: input.tips.trim(),
  video_url: input.videoUrl?.trim() || null,
});

function requireClient() {
  if (!supabaseClient) {
    throw new Error('Supabase no está configurado. No se mostrarán ejercicios de demostración.');
  }
  return supabaseClient;
}

export const exerciseLibraryRepository = {
  async listCatalog(): Promise<ExerciseDefinition[]> {
    const client = requireClient();
    const { data, error } = await client
      .from('exercise_catalog')
      .select(CATALOG_COLUMNS)
      .is('archived_at', null)
      .order('name');

    if (error) throw new Error('No se pudo cargar el catálogo general. Inténtalo nuevamente.');
    return (data ?? []).map(toExerciseDefinition);
  },

  async listTenantExercises(tenantId: string, includeArchived = false): Promise<ExerciseDefinition[]> {
    const client = requireClient();
    let query = client
      .from('tenant_exercises')
      .select(TENANT_EXERCISE_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('name');

    if (!includeArchived) query = query.is('archived_at', null);
    const { data, error } = await query;

    if (error) throw new Error('No se pudieron cargar los ejercicios del gimnasio. Inténtalo nuevamente.');
    return (data ?? []).map(toExerciseDefinition);
  },

  async createTenantExercise(
    tenantId: string,
    coachId: string,
    input: ExerciseDefinitionInput
  ): Promise<void> {
    const { error } = await requireClient()
      .from('tenant_exercises')
      .insert({ ...toDatabaseInput(input), tenant_id: tenantId, created_by: coachId });

    if (error) throw new Error('No se pudo guardar el ejercicio. Revisa los datos e inténtalo nuevamente.');
  },

  async copyCatalogExercise(
    tenantId: string,
    coachId: string,
    exercise: ExerciseDefinition
  ): Promise<void> {
    const { error } = await requireClient()
      .from('tenant_exercises')
      .insert({
        ...toDatabaseInput(exercise),
        tenant_id: tenantId,
        created_by: coachId,
        source_catalog_exercise_id: exercise.id,
      });

    if (error) throw new Error('No se pudo copiar el ejercicio al gimnasio. Inténtalo nuevamente.');
  },

  async updateTenantExercise(
    tenantId: string,
    exerciseId: string,
    input: ExerciseDefinitionInput
  ): Promise<void> {
    const { data, error } = await requireClient()
      .from('tenant_exercises')
      .update(toDatabaseInput(input))
      .eq('id', exerciseId)
      .eq('tenant_id', tenantId)
      .select('id')
      .maybeSingle();

    if (error || !data) throw new Error('No se pudo actualizar este ejercicio del gimnasio.');
  },

  async setArchived(tenantId: string, exerciseId: string, archived: boolean): Promise<void> {
    const { data, error } = await requireClient()
      .from('tenant_exercises')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', exerciseId)
      .eq('tenant_id', tenantId)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      throw new Error(archived
        ? 'No se pudo archivar este ejercicio.'
        : 'No se pudo restaurar este ejercicio.');
    }
  },
};