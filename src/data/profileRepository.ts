import { supabaseClient } from '@/data/supabase/client';
import type { Profile } from '@/domain/profile';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function requireImageExtension(file: File): string {
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension || file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Elige una imagen JPG, PNG o WebP de 5 MB o menos.');
  }
  return extension;
}

function requireClient() {
  if (!supabaseClient) throw new Error('Supabase no está configurado.');
  return supabaseClient;
}

export const profileRepository = {
  async getTenantWhatsappAvatar(): Promise<string | null> {
    const { data, error } = await requireClient().rpc('get_own_tenant_whatsapp_avatar');
    if (error || (data !== null && typeof data !== 'string')) throw new Error('No se pudo cargar el avatar.');
    return data;
  },

  async setTenantWhatsappAvatar(file: File | null, tenantId: string, previousPath: string | null): Promise<string | null> {
    const client = requireClient();
    let path: string | null = null;
    if (file) {
      if (file.type !== 'image/png' || file.size > MAX_IMAGE_SIZE_BYTES) throw new Error('Elige un PNG de 5 MB o menos.');
      path = `whatsapp-avatars/${tenantId}/${crypto.randomUUID()}.png`;
      const { error } = await client.storage.from('profile-media').upload(path, file, { contentType: 'image/png', cacheControl: '3600', upsert: false });
      if (error) throw new Error('No se pudo subir el avatar.');
    }
    const { error } = await client.rpc('set_own_tenant_whatsapp_avatar', { p_path: path });
    if (error) {
      if (path) await client.storage.from('profile-media').remove([path]);
      throw new Error('No se pudo guardar el avatar.');
    }
    if (previousPath?.startsWith(`whatsapp-avatars/${tenantId}/`)) await client.storage.from('profile-media').remove([previousPath]);
    return path;
  },

  async getOwnCoachWhatsappContact(): Promise<{ coachName: string; number: string; avatarPath: string | null } | null> {
    const { data, error } = await requireClient().rpc('get_own_coach_whatsapp_contact');
    if (error || !Array.isArray(data)) throw new Error('No se pudo cargar el contacto de tu coach.');
    if (data.length === 0) return null;
    const contact = data[0];
    if (typeof contact.coach_name !== 'string' || typeof contact.whatsapp_number !== 'string'
      || !/^[1-9][0-9]{7,14}$/.test(contact.whatsapp_number)
      || (contact.avatar_path !== null && typeof contact.avatar_path !== 'string')) {
      throw new Error('No se pudo cargar el contacto de tu coach.');
    }
    return { coachName: contact.coach_name, number: contact.whatsapp_number, avatarPath: contact.avatar_path };
  },

  async getOwnCoachWhatsappNumber(profileId: string): Promise<string | null> {
    const client = requireClient();
    const { data, error } = await client.from('profiles').select('whatsapp_number').eq('id', profileId).single();
    if (error || !data || (data.whatsapp_number !== null && typeof data.whatsapp_number !== 'string')) {
      throw new Error('No se pudo cargar tu número de WhatsApp.');
    }
    return data.whatsapp_number;
  },

  async setOwnCoachWhatsappNumber(number: string): Promise<string | null> {
    const client = requireClient();
    const { data, error } = await client.rpc('set_own_coach_whatsapp_number', { p_number: number });
    if (error) throw new Error(error.message.includes('invalid_whatsapp_number')
      ? 'Ingresa el número internacional sin espacios ni símbolos.'
      : 'No se pudo guardar tu número de WhatsApp.');
    if (data !== null && typeof data !== 'string') throw new Error('No se pudo confirmar el número guardado.');
    return data;
  },

  getPublicMediaUrl(path: string | null): string | null {
    return path && supabaseClient
      ? supabaseClient.storage.from('profile-media').getPublicUrl(path).data.publicUrl
      : null;
  },

  async uploadStudentAvatar(file: File, profile: Profile): Promise<string> {
    const client = requireClient();
    const path = `avatars/${profile.id}/${crypto.randomUUID()}.${requireImageExtension(file)}`;
    const { error: uploadError } = await client.storage.from('profile-media').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw new Error('No se pudo subir la foto. Inténtalo nuevamente.');

    const { error: saveError } = await client.rpc('set_own_profile_avatar', { p_avatar_path: path });
    if (saveError) {
      await client.storage.from('profile-media').remove([path]);
      throw new Error('No se pudo guardar la foto en tu perfil. Inténtalo nuevamente.');
    }

    if (profile.avatar_path) await client.storage.from('profile-media').remove([profile.avatar_path]);
    return client.storage.from('profile-media').getPublicUrl(path).data.publicUrl;
  },

  async uploadGymLogo(file: File, tenantId: string, previousLogoUrl: string | null): Promise<string> {
    const client = requireClient();
    const path = `logos/${tenantId}/${crypto.randomUUID()}.${requireImageExtension(file)}`;
    const { error: uploadError } = await client.storage.from('profile-media').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw new Error('No se pudo subir el logo. Inténtalo nuevamente.');

    const logoUrl = client.storage.from('profile-media').getPublicUrl(path).data.publicUrl;
    const { error: saveError } = await client.rpc('set_own_tenant_logo', { p_logo_url: logoUrl });
    if (saveError) {
      await client.storage.from('profile-media').remove([path]);
      throw new Error('No se pudo guardar el logo del gimnasio. Inténtalo nuevamente.');
    }

    if (previousLogoUrl) {
      const marker = '/storage/v1/object/public/profile-media/';
      const oldPath = previousLogoUrl.split(marker)[1];
      if (oldPath?.startsWith(`logos/${tenantId}/`)) {
        await client.storage.from('profile-media').remove([decodeURIComponent(oldPath)]);
      }
    }
    return logoUrl;
  },

  async setTenantDescription(description: string): Promise<string> {
    const client = requireClient();
    const { data, error } = await client.rpc('set_own_tenant_description', {
      p_description: description,
    });
    if (error) throw new Error('No se pudo guardar la descripción del gimnasio. Inténtalo nuevamente.');
    if (typeof data !== 'string') throw new Error('El servidor no confirmó la descripción del gimnasio.');
    return data;
  },

  async setTenantBranding(theme: Record<string, string>): Promise<void> {
    const client = requireClient();
    const { error } = await client.rpc('set_own_tenant_theme', { p_theme: theme });
    if (error) throw new Error(error.message.includes('invalid_theme_color')
      ? 'Los colores deben usar formato hexadecimal válido.'
      : 'No se pudo guardar la paleta del gimnasio.');
  },

  async getOwnCoachName(): Promise<string | null> {
    if (!supabaseClient) throw new Error('Supabase no está configurado.');

    const { data, error } = await supabaseClient.rpc('get_own_coach_name');
    if (error) throw new Error('No se pudo cargar la información del coach.');
    if (data === null) return null;
    if (typeof data !== 'string') throw new Error('El nombre del coach recibido no es válido.');
    return data.trim() || null;
  },
};
