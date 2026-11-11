import { describe, expect, it } from 'vitest';
import { toCoachMember } from '@/domain/coachMember';

describe('coach member profiles', () => {
  it('maps only fields persisted in the member profile', () => {
    expect(toCoachMember({
      id: 'member-id',
      full_name: 'Alumna Invitada',
      status: 'ACTIVE',
      created_at: '2026-11-10T12:00:00.000Z',
      tenant_id: 'tenant-id',
      coach_id: 'coach-id',
    })).toEqual({
      id: 'member-id',
      fullName: 'Alumna Invitada',
      status: 'ACTIVE',
      createdAt: '2026-11-10T12:00:00.000Z',
    });
  });

  it('rejects malformed or unsupported profile records', () => {
    expect(() => toCoachMember({ id: 'member-id' })).toThrow('no es válido');
    expect(() => toCoachMember({
      id: 'member-id',
      full_name: 'Alumna Invitada',
      status: 'PENDING',
      created_at: '2026-11-10T12:00:00.000Z',
    })).toThrow('no es válido');
  });
});