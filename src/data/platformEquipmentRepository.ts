import { supabaseClient } from '@/data/supabase/client';

export interface PlatformTenant {
  id: string;
  name: string;
  subdomain: string;
  description: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface CoachProfile {
  id: string;
  tenantId: string;
  role: 'coach_admin';
  status: 'ACTIVE' | 'SUSPENDED';
  fullName: string;
}

export interface CoachInvitation {
  id: string;
  email: string;
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  authUserId: string | null;
  lastSentAt: string | null;
  resendCount: number;
}

export interface TenantEquipmentOption {
  id: string;
  tenantId: string;
  name: string;
  position: number;
  archivedAt: string | null;
}

function requireClient() {
  if (!supabaseClient) throw new Error('Supabase no está configurado.');
  return supabaseClient;
}

export const platformEquipmentRepository = {
  async createTenant(input: { name: string; subdomain: string; description: string }): Promise<string> {
    const { data, error } = await requireClient().rpc('create_platform_tenant', {
      p_name: input.name,
      p_subdomain: input.subdomain,
      p_description: input.description,
    });
    if (error) throw new Error(error.message.includes('tenant_subdomain_taken')
      ? 'Ese subdominio ya está registrado.'
      : 'No se pudo crear el gimnasio.');
    if (typeof data !== 'string') throw new Error('El servidor no confirmó el gimnasio creado.');
    return data;
  },

  async updateTenant(input: { id: string; name: string; subdomain: string; description: string; status: 'ACTIVE' | 'SUSPENDED' }): Promise<void> {
    const { error } = await requireClient().rpc('update_platform_tenant', {
      p_tenant_id: input.id,
      p_name: input.name,
      p_subdomain: input.subdomain,
      p_description: input.description,
      p_status: input.status,
    });
    if (error) throw new Error(error.message.includes('tenant_subdomain_taken')
      ? 'Ese subdominio ya está registrado.'
      : 'No se pudo actualizar el gimnasio.');
  },

  async provisionCoach(input: { tenantId: string; email: string; fullName: string }): Promise<void> {
    const { error } = await requireClient().functions.invoke('platform-provision-coach', {
      body: { action: 'provision', tenant_id: input.tenantId, email: input.email, full_name: input.fullName },
    });
    if (error) throw new Error(error.message.includes('coach_invitation_pending') ? 'Ya existe una invitación pendiente para este correo.' : 'No se pudo crear el coach.');
  },

  async listCoachInvitations(tenantId: string): Promise<{ coaches: CoachProfile[]; invitations: CoachInvitation[] }> {
    const { data, error } = await requireClient().functions.invoke('platform-provision-coach', {
      body: { action: 'list', tenant_id: tenantId },
    });
    if (error) throw new Error('No se pudo cargar el estado de los coaches.');
    const payload = data as {
      coaches?: Array<{ id: string; tenant_id: string; role: 'coach_admin'; status: 'ACTIVE' | 'SUSPENDED'; full_name: string }>;
      invitations?: Array<{ id: string; email: string; status: CoachInvitation['status']; created_at: string; expires_at: string; accepted_at: string | null; auth_user_id: string | null; last_sent_at: string | null; resend_count: number }>;
    };
    return {
      coaches: (payload?.coaches ?? []).map((coach) => ({ id: coach.id, tenantId: coach.tenant_id, role: coach.role, status: coach.status, fullName: coach.full_name })),
      invitations: (payload?.invitations ?? []).map((invitation) => ({ id: invitation.id, email: invitation.email, status: invitation.status, createdAt: invitation.created_at, expiresAt: invitation.expires_at, acceptedAt: invitation.accepted_at, authUserId: invitation.auth_user_id, lastSentAt: invitation.last_sent_at, resendCount: invitation.resend_count ?? 0 })),
    };
  },

  async resendCoachInvitation(tenantId: string, invitationId: string): Promise<void> {
    const { error } = await requireClient().functions.invoke('platform-provision-coach', {
      body: { action: 'resend', tenant_id: tenantId, invitation_id: invitationId, email: '', full_name: '' },
    });
    if (error) throw new Error('No se pudo reenviar la invitación.');
  },

  async cancelCoachInvitation(tenantId: string, invitationId: string): Promise<void> {
    const { error } = await requireClient().functions.invoke('platform-provision-coach', {
      body: { action: 'cancel', tenant_id: tenantId, invitation_id: invitationId, email: '', full_name: '' },
    });
    if (error) throw new Error('No se pudo cancelar la invitación.');
  },

  async listTenants(): Promise<PlatformTenant[]> {
    const { data, error } = await requireClient()
      .from('tenants')
      .select('id, name, subdomain, description, status')
      .order('name');
    if (error) throw new Error('No se pudieron cargar los gimnasios.');
    return (data ?? []).map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      description: tenant.description ?? '',
      status: tenant.status,
    }));
  },

  async listOptions(tenantId: string): Promise<TenantEquipmentOption[]> {
    const { data, error } = await requireClient()
      .from('tenant_equipment_options')
      .select('id, tenant_id, name, position, archived_at')
      .eq('tenant_id', tenantId)
      .order('position');
    if (error) throw new Error('No se pudieron cargar los equipos configurados.');
    return (data ?? []).map((option) => ({
      id: option.id,
      tenantId: option.tenant_id,
      name: option.name,
      position: option.position,
      archivedAt: option.archived_at,
    }));
  },

  async createOption(tenantId: string, name: string): Promise<TenantEquipmentOption> {
    const normalized = name.trim();
    if (!normalized) throw new Error('Escribe el nombre del equipo.');
    if (normalized.length > 80) throw new Error('El nombre no puede superar 80 caracteres.');

    const client = requireClient();
    const { data: current, error: positionError } = await client
      .from('tenant_equipment_options')
      .select('position')
      .eq('tenant_id', tenantId)
      .is('archived_at', null)
      .order('position', { ascending: false })
      .limit(1);
    if (positionError) throw new Error('No se pudo calcular la posición del equipo.');

    const position = (current?.[0]?.position ?? 0) + 1;
    const { data, error } = await client
      .from('tenant_equipment_options')
      .insert({ tenant_id: tenantId, name: normalized, position })
      .select('id, tenant_id, name, position, archived_at')
      .single();
    if (error) throw new Error(error.message.includes('tenant_equipment_options_tenant_name_unique')
      ? 'Ya existe una opción con ese nombre.'
      : 'No se pudo crear la opción de equipo.');
    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      position: data.position,
      archivedAt: data.archived_at,
    };
  },

  async renameOption(optionId: string, tenantId: string, name: string): Promise<void> {
    const normalized = name.trim();
    if (!normalized) throw new Error('Escribe el nombre del equipo.');
    if (normalized.length > 80) throw new Error('El nombre no puede superar 80 caracteres.');

    const { error } = await requireClient()
      .from('tenant_equipment_options')
      .update({ name: normalized })
      .eq('id', optionId)
      .eq('tenant_id', tenantId);
    if (error) throw new Error('No se pudo renombrar la opción de equipo.');
  },

  async setArchived(optionId: string, tenantId: string, archived: boolean): Promise<void> {
    const { error } = await requireClient()
      .from('tenant_equipment_options')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', optionId)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(archived
      ? 'No se pudo archivar la opción de equipo.'
      : 'No se pudo restaurar la opción de equipo.');
  },
};
