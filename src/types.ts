export type { Exercise, ExerciseDifficulty } from '@/domain/exercise';
export type { Tenant, TenantFeatures, TenantStatus, TenantTheme } from '@/domain/tenant';

export type Role = 'student' | 'coach';
export type Screen =
  | 'home'
  | 'routines'
  | 'training'
  | 'progress'
  | 'profile'
  | 'students'
  | 'studentDetail'
  | 'programRoutine'
  | 'exerciseLibrary';

export interface StudentRoutineTarget {
  assignmentId: string;
  cycleDayPosition: number;
  executionDate: string;
}
