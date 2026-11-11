import { supabaseClient } from '@/data/supabase/client';
import { toCoachMember } from '@/domain/coachMember';
import type { CoachMember } from '@/domain/coachMember';

export const coachMemberRepository = {
  async listInvitedByCoach(): Promise<CoachMember[]> {
    if (!supabaseClient) throw new Error('Supabase no está configurado.');

    const { data, error } = await supabaseClient.rpc('list_coach_personalized_members');

    if (error) {
      throw new Error('No se pudieron cargar las alumnas invitadas. Inténtalo nuevamente.');
    }

    return (data ?? []).map(toCoachMember);
  },

  async setInvitedMemberStatus(memberId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
    if (!supabaseClient) throw new Error('Supabase no está configurado.');

    const { data, error } = await supabaseClient.functions.invoke('set-personalized-member-status', {
      body: { member_id: memberId, status },
    });

    if (error) {
      let code = '';
      if (error.context instanceof Response) {
        try {
          const response = await error.context.clone().json() as { error?: unknown };
          if (typeof response.error === 'string') code = response.error;
        } catch {
          code = '';
        }
      }

      const messages: Record<string, string> = {
        coach_access_required: 'Tu sesión de coach no está activa. Inicia sesión nuevamente.',
        member_access_required: 'Solo puedes cambiar el estado de alumnas que tú invitaste.',
        gym_not_active: 'No se pueden cambiar accesos mientras el gimnasio esté suspendido.',
      };
      throw new Error(messages[code] ?? 'No se pudo actualizar el acceso de la alumna. Inténtalo nuevamente.');
    }

    const expectedStatus = status === 'ACTIVE' ? 'active' : 'inactive';
    if (data?.status !== expectedStatus) {
      throw new Error('El servidor no confirmó el cambio de acceso.');
    }
  },
};