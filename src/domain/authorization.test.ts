import { describe, expect, it } from 'vitest';
import {
  canRoleOpenScreen,
  getProductRole,
  hasRoleCapability,
} from '@/domain/authorization';

describe('role authorization', () => {
  it('maps persisted roles to product UI roles', () => {
    expect(getProductRole('coach_admin')).toBe('coach');
    expect(getProductRole('user_personalized')).toBe('student');
    expect(getProductRole('super_admin')).toBeNull();
    expect(getProductRole('user_general')).toBeNull();
  });

  it('exposes capabilities without granting unrelated permissions', () => {
    expect(hasRoleCapability('coach_admin', 'manage_routines')).toBe(true);
    expect(hasRoleCapability('coach_admin', 'manage_tenants')).toBe(false);
    expect(hasRoleCapability('user_personalized', 'record_own_workouts')).toBe(true);
    expect(hasRoleCapability('user_personalized', 'manage_routines')).toBe(false);
  });

  it('keeps the deferred general role denied', () => {
    expect(hasRoleCapability('user_general', 'view_assigned_routines')).toBe(false);
    expect(hasRoleCapability('user_general', 'record_own_workouts')).toBe(false);
  });

  it('limits navigation screens by product role', () => {
    expect(canRoleOpenScreen('student', 'training')).toBe(true);
    expect(canRoleOpenScreen('student', 'students')).toBe(false);
    expect(canRoleOpenScreen('coach', 'exerciseLibrary')).toBe(true);
    expect(canRoleOpenScreen('coach', 'progress')).toBe(false);
  });
});
