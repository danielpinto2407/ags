import { describe, expect, it } from 'vitest';
import { toCoachMember } from '@/domain/coachMember';

describe('coach member profiles', () => {
  it('maps the coach-scoped roster RPC response', () => {
    expect(toCoachMember({
      member_id: 'member-id',
      full_name: 'Alumna Invitada',
      member_status: 'ACTIVE',
      created_at: '2026-11-10T12:00:00.000Z',
      email: 'alumna@example.test',
      avatar_path: null,
      has_active_programming: false,
    })).toEqual({
      id: 'member-id',
      fullName: 'Alumna Invitada',
      email: 'alumna@example.test',
      avatarPath: null,
      avatarUrl: null,
      hasActiveProgramming: false,
      status: 'ACTIVE',
      createdAt: '2026-11-10T12:00:00.000Z',
    });
  });

  it('rejects malformed or unsupported roster records', () => {
    expect(() => toCoachMember({ member_id: 'member-id' })).toThrow('no es válido');
    expect(() => toCoachMember({
      member_id: 'member-id',
      full_name: 'Alumna Invitada',
      member_status: 'PENDING',
      created_at: '2026-11-10T12:00:00.000Z',
      email: null,
      avatar_path: null,
    })).toThrow('no es válido');
  });

  it('preserves the student avatar storage path returned by the coach roster RPC', () => {
    expect(toCoachMember({
      member_id: 'member-id',
      full_name: 'Alumna Invitada',
      member_status: 'ACTIVE',
      created_at: '2026-11-10T12:00:00.000Z',
      email: 'alumna@example.test',
      avatar_path: 'avatars/member-id/avatar.webp',
      has_active_programming: true,
    })).toMatchObject({
      avatarPath: 'avatars/member-id/avatar.webp',
      avatarUrl: null,
      hasActiveProgramming: true,
    });
  });
});