import { useEffect, useState } from 'react';
import { routineAssignmentRepository } from '@/data/routineAssignmentRepository';
import type {
  RoutineAssignment,
  SaveRoutineAssignmentDraftInput,
  SaveTrainingProgramDraftInput,
} from '@/domain/routineAssignment';

export type CoachRoutineAssignmentsState =
  | { status: 'loading'; assignments: RoutineAssignment[] }
  | { status: 'error'; assignments: RoutineAssignment[]; message: string }
  | { status: 'loaded'; assignments: RoutineAssignment[] };

export function useCoachRoutineAssignments(tenantId: string, coachId: string, scheduledFor: string) {
  const [state, setState] = useState<CoachRoutineAssignmentsState>({ status: 'loading', assignments: [] });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ status: 'loading', assignments: current.assignments }));

    routineAssignmentRepository.listForCoach(tenantId, coachId, scheduledFor)
      .then((assignments) => {
        if (!cancelled) setState({ status: 'loaded', assignments });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          assignments: [],
          message: error instanceof Error ? error.message : 'No se pudieron cargar las rutinas.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [coachId, reloadKey, scheduledFor, tenantId]);

  return {
    state,
    reload: () => setReloadKey((key) => key + 1),
    saveDraft: async (input: SaveRoutineAssignmentDraftInput) => {
      const assignmentId = await routineAssignmentRepository.saveDraft(input);
      setReloadKey((key) => key + 1);
      return assignmentId;
    },
    saveTrainingProgramDraft: async (input: SaveTrainingProgramDraftInput) => {
      const assignmentId = await routineAssignmentRepository.saveTrainingProgramDraft(input);
      setReloadKey((key) => key + 1);
      return assignmentId;
    },
    publish: async (assignmentId: string) => {
      await routineAssignmentRepository.publish(assignmentId);
      setReloadKey((key) => key + 1);
    },
  };
}
