import { supabaseClient } from '@/data/supabase/client';
import { toCoachMember } from '@/domain/coachMember';
import type { CoachMember } from '@/domain/coachMember';

export const coachMemberRepository = {
  async listInvitedByCoach(coachId: string): Promise<CoachMember[]> {
    if (!supabaseClient) throw new Error('Supabase no está configurado.');

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id, full_name, status, created_at')
      .eq('role', 'user_personalized')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('No se pudieron cargar las alumnas invitadas. Inténtalo nuevamente.');
    }

    return (data ?? []).map(toCoachMember);
  },
};