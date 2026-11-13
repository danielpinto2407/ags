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

  async getOwnCoachName(): Promise<string | null> {
    if (!supabaseClient) throw new Error('Supabase no está configurado.');

    const { data, error } = await supabaseClient.rpc('get_own_coach_name');
    if (error) throw new Error('No se pudo cargar la información del coach.');
    if (data === null) return null;
    if (typeof data !== 'string') throw new Error('El nombre del coach recibido no es válido.');
    return data.trim() || null;
  },
};
