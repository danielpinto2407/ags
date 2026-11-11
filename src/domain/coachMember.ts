export type CoachMemberStatus = 'ACTIVE' | 'INACTIVE';

export interface CoachMember {
  id: string;
  fullName: string;
  email: string | null;
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
  ) {
    throw new Error('El perfil de alumna recibido no es válido.');
  }

  return {
    id: row.member_id,
    fullName: row.full_name,
    email: row.email,
    status: row.member_status,
    createdAt: row.created_at,
  };
}