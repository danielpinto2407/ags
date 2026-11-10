export type { Achievement } from '@/domain/achievement';
export type { Coach } from '@/domain/coach';
export type { Exercise, ExerciseDifficulty } from '@/domain/exercise';
export type { ProgressEntry } from '@/domain/progress';
export type { Student, StudentStatus } from '@/domain/student';
export type { Tenant, TenantFeatures, TenantStatus, TenantTheme } from '@/domain/tenant';

export type Role = 'student' | 'coach';

export const DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] as const;
export type Day = (typeof DAYS)[number];

export type Screen =
  | 'home'
  | 'routines'
  | 'progress'
  | 'profile'
  | 'students'
  | 'studentDetail'
  | 'programRoutine'
  | 'exerciseLibrary';

export type RoutineMap = Record<Day, import('@/domain/exercise').Exercise[]>;
