import { supabaseClient } from '@/data/supabase/client';

export const profileRepository = {
  async getOwnCoachName(): Promise<string | null> {
    if (!supabaseClient) throw new Error('Supabase no está configurado.');

    const { data, error } = await supabaseClient.rpc('get_own_coach_name');
    if (error) throw new Error('No se pudo cargar la información del coach.');
    if (data === null) return null;
    if (typeof data !== 'string') throw new Error('El nombre del coach recibido no es válido.');
    return data.trim() || null;
  },
};
