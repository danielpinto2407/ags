import { useEffect, useState } from 'react';
import { routineAssignmentRepository } from '@/data/routineAssignmentRepository';
import type { RoutineAssignment } from '@/domain/routineAssignment';

export type StudentRoutineAssignmentState =
  | { status: 'loading'; assignment: RoutineAssignment | null }
  | { status: 'error'; assignment: RoutineAssignment | null; message: string }
  | { status: 'loaded'; assignment: RoutineAssignment | null };

export function useStudentRoutineAssignment(studentId: string, tenantId: string, scheduledFor: string) {
  const [state, setState] = useState<StudentRoutineAssignmentState>({ status: 'loading', assignment: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ status: 'loading', assignment: current.assignment }));

    routineAssignmentRepository.getForStudent(studentId, tenantId, scheduledFor)
      .then((assignment) => {
        if (!cancelled) setState({ status: 'loaded', assignment });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          assignment: null,
          message: error instanceof Error ? error.message : 'No se pudo cargar tu programación.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, scheduledFor, studentId, tenantId]);

  return { state, reload: () => setReloadKey((key) => key + 1) };
}
