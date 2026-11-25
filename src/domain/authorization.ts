export type ProfileRole =
  | 'super_admin'
  | 'coach_admin'
  | 'user_personalized'
  | 'user_general';

export type ProfileStatus = 'ACTIVE' | 'INACTIVE';

export type ProductRole = 'student' | 'coach';
export type AppScreen =
  | 'home'
  | 'routines'
  | 'training'
  | 'progress'
  | 'profile'
  | 'students'
  | 'studentDetail'
  | 'programRoutine'
  | 'exerciseLibrary';

export type AppCapability =
  | 'manage_platform'
  | 'manage_tenants'
  | 'manage_all_profiles'
  | 'manage_coach_profiles'
  | 'manage_tenant_branding'
  | 'manage_tenant_exercises'
  | 'manage_routines'
  | 'manage_assigned_students'
  | 'view_assigned_routines'
  | 'record_own_workouts'
  | 'contact_assigned_coach'
  | 'discover_group_classes'
  | 'book_group_classes';

export const ROLE_CAPABILITIES: Record<ProfileRole, readonly AppCapability[]> = {
  super_admin: ['manage_platform', 'manage_tenants', 'manage_all_profiles'],
  coach_admin: [
    'manage_coach_profiles',
    'manage_tenant_branding',
    'manage_tenant_exercises',
    'manage_routines',
    'manage_assigned_students',
  ],
  user_personalized: ['view_assigned_routines', 'record_own_workouts', 'contact_assigned_coach'],
  user_general: ['discover_group_classes', 'book_group_classes'],
};

export function getProductRole(role: ProfileRole): ProductRole | null {
  if (role === 'coach_admin') return 'coach';
  if (role === 'user_personalized') return 'student';
  return null;
}

export function hasRoleCapability(role: ProfileRole, capability: AppCapability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export function getRoleCapabilities(role: ProfileRole): readonly AppCapability[] {
  return ROLE_CAPABILITIES[role];
}

export function isTenantProfileRole(role: ProfileRole): boolean {
  return role !== 'super_admin';
}

const STUDENT_SCREENS: readonly AppScreen[] = ['home', 'routines', 'training', 'progress', 'profile'];
const COACH_SCREENS: readonly AppScreen[] = ['home', 'students', 'studentDetail', 'programRoutine', 'exerciseLibrary', 'profile'];

export function getRoleScreens(role: ProductRole): readonly AppScreen[] {
  return role === 'student' ? STUDENT_SCREENS : COACH_SCREENS;
}

export function canRoleOpenScreen(role: ProductRole, screen: AppScreen): boolean {
  return getRoleScreens(role).includes(screen);
}
