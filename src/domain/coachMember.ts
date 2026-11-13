export type CoachMemberStatus = 'ACTIVE' | 'INACTIVE';

export interface CoachMember {
  id: string;
  fullName: string;
  email: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  hasActiveProgramming: boolean;
  status: CoachMemberStatus;
  createdAt: string;
}

export function toCoachMember(value: unknown): CoachMember {
  if (!value || typeof value !== 'object') {
    throw new Error('El perfil de alumna recibido no es válido.');
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.member_id !== 'string'
    || typeof row.full_name !== 'string'
    || (row.member_status !== 'ACTIVE' && row.member_status !== 'INACTIVE')
    || typeof row.created_at !== 'string'
    || (row.email !== null && typeof row.email !== 'string')
    || (row.avatar_path !== null && typeof row.avatar_path !== 'string')
    || typeof row.has_active_programming !== 'boolean'
  ) {
    throw new Error('El perfil de alumna recibido no es válido.');
  }

  return {
    id: row.member_id,
    fullName: row.full_name,
    email: row.email,
    avatarPath: row.avatar_path as string | null,
    avatarUrl: null,
    hasActiveProgramming: row.has_active_programming,
    status: row.member_status,
    createdAt: row.created_at,
  };
}