import { supabaseClient } from '@/data/supabase/client';

export type InvitationDeliveryStatus = 'sent' | 'resent';

async function getFunctionErrorCode(error: { context?: unknown }): Promise<string> {
  if (!(error.context instanceof Response)) return '';

  try {
    const body = await error.context.clone().json() as { error?: unknown };
    return typeof body.error === 'string' ? body.error : '';
  } catch {
    return '';
  }
}

function invitationErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    authentication_required: 'Inicia sesión nuevamente para enviar la invitación.',
    invalid_session: 'Tu sesión ya no es válida. Inicia sesión nuevamente.',
    coach_access_required: 'Solo un coach activo puede invitar alumnas a este gimnasio.',
    gym_member_limit_reached: 'El gimnasio alcanzó su límite de miembros.',
    member_already_exists: 'Este correo ya pertenece a un miembro del gimnasio.',
    gym_not_active: 'No se pueden enviar invitaciones mientras el gimnasio esté suspendido.',
    invalid_email: 'Ingresa un correo electrónico válido.',
    invitation_email_failed: 'No se pudo enviar el correo. Inténtalo nuevamente.',
    invitation_link_failed: 'El correo se envió, pero no se pudo completar la invitación. Reintenta el envío.',
  };

  return messages[code] ?? 'No se pudo enviar la invitación. Inténtalo nuevamente.';
}

function requireSupabaseClient() {
  if (!supabaseClient) throw new Error('Supabase no está configurado.');
  return supabaseClient;
}

export const invitationRepository = {
  async invitePersonalizedMember(email: string): Promise<InvitationDeliveryStatus> {
    const client = requireSupabaseClient();
    const { data, error } = await client.functions.invoke('invite-personalized-member', {
      body: { email: email.trim().toLowerCase() },
    });

    if (error) {
      const code = await getFunctionErrorCode(error);
      throw new Error(invitationErrorMessage(code));
    }

    if (data?.status !== 'sent' && data?.status !== 'resent') {
      throw new Error('El servidor no confirmó el envío de la invitación.');
    }

    return data.status;
  },

  async acceptPersonalizedInvitation(
    invitationId: string,
    fullName: string,
    password: string
  ): Promise<void> {
    const client = requireSupabaseClient();
    const { error: passwordError } = await client.auth.updateUser({ password });
    if (passwordError) {
      throw new Error('No se pudo guardar tu contraseña. Revisa el enlace e inténtalo nuevamente.');
    }

    const { error } = await client.functions.invoke('accept-personalized-invitation', {
      body: { invitation_id: invitationId, full_name: fullName.trim() },
    });

    if (error) {
      const code = await getFunctionErrorCode(error);
      throw new Error(invitationErrorMessage(code));
    }
  },
};