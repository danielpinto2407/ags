export type { Exercise, ExerciseDifficulty } from '@/domain/exercise';
export type { Tenant, TenantFeatures, TenantStatus, TenantTheme } from '@/domain/tenant';

export type Role = 'student' | 'coach';

export type Screen =
  | 'home'
  | 'routines'
  | 'progress'
  | 'profile'
  | 'students'
  | 'studentDetail'
  | 'programRoutine'
  | 'exerciseLibrary';
