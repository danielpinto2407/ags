import {
  toTrainingProgramPayload,
  toRoutineAssignmentItemPayload,
  type SaveRoutineAssignmentDraftInput,
  type SaveTrainingProgramDraftInput,
} from '@/domain/routineAssignment';
import { requireRoutineClient } from '@/data/routineAssignmentData';

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

export const routineAssignmentWriteService = {
  async saveTrainingProgramDraft(input: SaveTrainingProgramDraftInput): Promise<string> {
    const { data, error } = await requireRoutineClient().rpc('save_training_program_draft', toTrainingProgramPayload(input));
    if (error) throw assignmentError(error);
    if (typeof data !== 'string') throw new Error('El servidor no confirmó el borrador.');
    return data;
  },

  async saveDraft(input: SaveRoutineAssignmentDraftInput): Promise<string> {
    const { data, error } = await requireRoutineClient().rpc('save_routine_assignment_draft', {
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
    const { data, error } = await requireRoutineClient().rpc('publish_training_program', { p_assignment_id: assignmentId });
    if (error) throw assignmentError(error);
    if (data !== assignmentId) throw new Error('El servidor no confirmó la publicación.');
  },
};
