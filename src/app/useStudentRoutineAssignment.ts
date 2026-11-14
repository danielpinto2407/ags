import { useEffect, useState } from 'react';
import { routineAssignmentRepository } from '@/data/routineAssignmentRepository';
import type { RoutineAssignment } from '@/domain/routineAssignment';
import type {
  ActualExercisePerformance,
  CycleSlotHistory,
  StudentRoutineExecutionSnapshot,
} from '@/domain/workoutExecution';
import { utcWeekInputValues } from '@/domain/localDate';

export type StudentRoutineAssignmentState =
  | { status: 'loading'; assignment: RoutineAssignment | null; assignments: RoutineAssignment[]; execution: StudentRoutineExecutionSnapshot | null; cycleSlotHistory: Record<string, CycleSlotHistory>; executionDates: string[] }
  | { status: 'error'; assignment: RoutineAssignment | null; assignments: RoutineAssignment[]; execution: StudentRoutineExecutionSnapshot | null; cycleSlotHistory: Record<string, CycleSlotHistory>; executionDates: string[]; message: string }
  | { status: 'loaded'; assignment: RoutineAssignment | null; assignments: RoutineAssignment[]; execution: StudentRoutineExecutionSnapshot | null; cycleSlotHistory: Record<string, CycleSlotHistory>; executionDates: string[] };

export function useStudentRoutineAssignment(studentId: string, tenantId: string, scheduledFor: string) {
  const [state, setState] = useState<StudentRoutineAssignmentState>({ status: 'loading', assignment: null, assignments: [], execution: null, cycleSlotHistory: {}, executionDates: [] });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ status: 'loading', assignment: current.assignment, assignments: current.assignments, execution: current.execution, cycleSlotHistory: current.cycleSlotHistory, executionDates: current.executionDates }));

    routineAssignmentRepository.getForStudent(studentId, tenantId, scheduledFor)
      .then(async (assignments) => {
        if (cancelled) return;
        const assignment = assignments.find(({ programMode }) => programMode === 'SINGLE_DAY')
          ?? assignments.find(({ programMode }) => programMode === 'CYCLE')
          ?? null;
        const weekDates = utcWeekInputValues(scheduledFor);
        const [execution, cycleSlotHistory, executionDates] = await Promise.all([
          routineAssignmentRepository.getExecutionForStudent(studentId, tenantId, scheduledFor, assignments),
          routineAssignmentRepository.getCycleSlotHistory(studentId, tenantId, assignments),
          routineAssignmentRepository.getExecutionDatesForStudent(studentId, tenantId, weekDates[0], weekDates[6]),
        ]);
        if (!cancelled) setState({ status: 'loaded', assignment, assignments, execution, cycleSlotHistory, executionDates });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState((current) => ({
          status: 'error',
          assignment: current.assignment,
          assignments: current.assignments,
          execution: current.execution,
          cycleSlotHistory: current.cycleSlotHistory,
          executionDates: current.executionDates,
          message: error instanceof Error ? error.message : 'No se pudo cargar tu programación.',
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, scheduledFor, studentId, tenantId]);

  return {
    state,
    reload: () => setReloadKey((key) => key + 1),
    savePerformance: async (
      assignmentId: string,
      cycleDayPosition: number,
      performance: ActualExercisePerformance
    ) => {
      const saved = await routineAssignmentRepository.savePerformance(
        assignmentId,
        cycleDayPosition,
        performance
      );
      setReloadKey((key) => key + 1);
      return saved;
    },
  };
}
