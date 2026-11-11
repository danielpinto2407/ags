export type CoachMemberStatus = 'ACTIVE' | 'INACTIVE';

export interface CoachMember {
  id: string;
  fullName: string;
  status: CoachMemberStatus;
  createdAt: string;
}

export function toCoachMember(value: unknown): CoachMember {
  if (!value || typeof value !== 'object') {
    throw new Error('El perfil de alumna recibido no es válido.');
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string'
    || typeof row.full_name !== 'string'
    || (row.status !== 'ACTIVE' && row.status !== 'INACTIVE')
    || typeof row.created_at !== 'string'
  ) {
    throw new Error('El perfil de alumna recibido no es válido.');
  }

  return {
    id: row.id,
    fullName: row.full_name,
    status: row.status,
    createdAt: row.created_at,
  };
}