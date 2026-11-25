import { supabaseClient } from '@/data/supabase/client';

export const ASSIGNMENT_COLUMNS = [
  'id', 'tenant_id', 'coach_id', 'student_id', 'program_mode', 'scheduled_for',
  'additional_cycle_repeats', 'cycle_day_count', 'title', 'status', 'published_at',
  'created_at', 'updated_at',
].join(', ');

export const ASSIGNMENT_ITEM_COLUMNS = [
  'id', 'assignment_id', 'tenant_id', 'cycle_day_id', 'position',
  'catalog_exercise_id', 'tenant_exercise_id', 'exercise_snapshot', 'prescribed_sets',
  'prescribed_reps', 'target_load', 'coach_instructions', 'work_duration', 'rest',
  'base_repetitions', 'repetitions_increment', 'base_load', 'load_increment', 'load_unit',
].join(', ');

export const ASSIGNMENT_DAY_COLUMNS = [
  'id', 'assignment_id', 'tenant_id', 'position', 'title',
].join(', ');

export function requireRoutineClient() {
  if (!supabaseClient) throw new Error('Supabase no está configurado.');
  return supabaseClient;
}
