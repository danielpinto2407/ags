import { useEffect, useState } from 'react';
import { Settings, ChevronRight, LogOut, Heart, Users, Dumbbell } from 'lucide-react';
import Header from '@/components/Header';
import ProfileImagePicker from '@/components/ProfileImagePicker';
import { profileRepository } from '@/data/profileRepository';
import { useTenantContext } from '@/app/tenant/tenantContext';
import type { Profile } from '@/domain/profile';
import { useCoachMembers } from '@/app/useCoachMembers';

interface CoachProfileProps {
  profile: Profile;
  onLogout: () => void;
}

export default function CoachProfile({ profile, onLogout }: CoachProfileProps) {
  const { state } = useCoachMembers(profile.id);
  const { state: tenantState, retry: refreshTenant } = useTenantContext();
  const tenant = tenantState.status === 'tenant' ? tenantState.tenant : null;
  const [logoUrl, setLogoUrl] = useState<string | null>(tenant?.theme.logoUrl ?? null);

  useEffect(() => {
    setLogoUrl(tenant?.theme.logoUrl ?? null);
  }, [tenant?.theme.logoUrl]);

  const uploadGymLogo = async (file: File) => {
    if (!profile.tenant_id) throw new Error('No se encontró el gimnasio de esta cuenta.');
    const nextLogoUrl = await profileRepository.uploadGymLogo(file, profile.tenant_id, logoUrl);
    setLogoUrl(nextLogoUrl);
    refreshTenant();
    return nextLogoUrl;
  };

  return (
    <div className="space-y-5">
      <Header title="Mi Perfil" showBell={false} />

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <ProfileImagePicker
            alt={tenant?.name ?? 'Logo del gimnasio'}
            fallback={<Dumbbell aria-hidden="true" size={27} />}
            imageUrl={logoUrl}
            label="Subir logo"
            onUpload={uploadGymLogo}
            shape="logo"
          />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-display font-bold text-white">{profile.full_name}</h2>
            <p className="truncate text-xs text-zinc-500">{tenant?.name ?? 'Perfil del gimnasio'}</p>
            <span className="inline-block mt-1 text-[10px] bg-brand-950/50 text-brand-400 px-2 py-0.5 rounded-full font-semibold border border-brand-900/50">
              Coach Certificada
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-zinc-800 pt-4">
          <Users size={17} className="text-brand-400" />
          <div>
            <p className="text-sm font-bold text-white">
              {state.status === 'loaded' ? state.members.length : state.status === 'loading' ? '…' : '—'}
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Alumnas invitadas</p>
          </div>
        </div>
      </div>

      <button className="w-full flex items-center gap-3 p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-left text-zinc-400" disabled type="button">
        <Settings size={18} className="flex-shrink-0" />
        <span className="flex-1 text-sm">Configuración</span>
        <ChevronRight size={16} className="text-zinc-700" />
      </button>

      {/* Logout */}
      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-brand-400 hover:bg-brand-950/30 transition-colors text-sm font-semibold">
        <LogOut size={16} />
        Cerrar Sesión
      </button>

      <p className="text-center text-[10px] text-zinc-700 flex items-center justify-center gap-1 pb-2">
        AGS Glutehouse v1.0 • Hecho con <Heart size={10} className="text-brand-700" />
      </p>
    </div>
  );
}
