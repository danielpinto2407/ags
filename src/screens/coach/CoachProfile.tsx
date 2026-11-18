import { useEffect, useState } from 'react';
import { LogOut, Heart, LoaderCircle, Users, Dumbbell } from 'lucide-react';
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
  const [loadingIconUrl, setLoadingIconUrl] = useState<string | null>(tenant?.theme.loadingIconUrl ?? null);
  const [description, setDescription] = useState(tenant?.description ?? '');
  const [savingDescription, setSavingDescription] = useState(false);
  const [resettingLoadingIcon, setResettingLoadingIcon] = useState(false);
  const [loadingIconFeedback, setLoadingIconFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [descriptionFeedback, setDescriptionFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    setLogoUrl(tenant?.theme.logoUrl ?? null);
  }, [tenant?.theme.logoUrl]);

  useEffect(() => {
    setLoadingIconUrl(tenant?.theme.loadingIconUrl ?? null);
  }, [tenant?.theme.loadingIconUrl]);

  useEffect(() => {
    setDescription(tenant?.description ?? '');
  }, [tenant?.description]);

  const uploadGymLogo = async (file: File) => {
    if (!profile.tenant_id) throw new Error('No se encontró el gimnasio de esta cuenta.');
    const nextLogoUrl = await profileRepository.uploadGymLogo(file, profile.tenant_id, logoUrl);
    setLogoUrl(nextLogoUrl);
    refreshTenant();
    return nextLogoUrl;
  };

  const uploadLoadingIcon = async (file: File) => {
    if (!profile.tenant_id) throw new Error('No se encontró el gimnasio de esta cuenta.');
    setLoadingIconFeedback(null);
    const nextLoadingIconUrl = await profileRepository.uploadTenantLoadingIcon(file, profile.tenant_id, loadingIconUrl);
    setLoadingIconUrl(nextLoadingIconUrl);
    setLoadingIconFeedback({ type: 'success', message: 'Icono de carga guardado.' });
    refreshTenant();
    return nextLoadingIconUrl;
  };

  const resetLoadingIcon = async () => {
    if (!profile.tenant_id) return;
    setResettingLoadingIcon(true);
    setLoadingIconFeedback(null);
    try {
      await profileRepository.clearTenantLoadingIcon(profile.tenant_id, loadingIconUrl);
      setLoadingIconUrl(null);
      setLoadingIconFeedback({ type: 'success', message: 'Se usará el icono predeterminado.' });
      refreshTenant();
    } catch (error) {
      setLoadingIconFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo restaurar el icono predeterminado.',
      });
    } finally {
      setResettingLoadingIcon(false);
    }
  };

  const saveDescription = async () => {
    setSavingDescription(true);
    setDescriptionFeedback(null);
    try {
      const savedDescription = await profileRepository.setTenantDescription(description);
      setDescription(savedDescription);
      setDescriptionFeedback({ type: 'success', message: 'Descripción guardada.' });
      refreshTenant();
    } catch (error) {
      setDescriptionFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo guardar la descripción.',
      });
    } finally {
      setSavingDescription(false);
    }
  };

  return (
    <div className="space-y-5">
      <Header title="Mi Perfil" showBell={false} showLogo={false} />

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
          </div>
        </div>

        <div className="space-y-2 border-t border-zinc-800 pt-4">
          <label className="block text-xs font-semibold text-zinc-300" htmlFor="tenant-login-description">
            Descripción del inicio de sesión
          </label>
          <textarea
            className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-brand-500 focus:outline-none"
            id="tenant-login-description"
            maxLength={280}
            onChange={(event) => {
              setDescription(event.target.value);
              setDescriptionFeedback(null);
            }}
            placeholder="Cuéntales brevemente qué ofrece tu gimnasio"
            rows={3}
            value={description}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-zinc-500">{description.length}/280 caracteres</p>
            <button
              className="min-h-10 rounded-lg bg-brand-600 px-4 text-xs font-bold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={savingDescription || description === (tenant?.description ?? '')}
              onClick={() => void saveDescription()}
              type="button"
            >
              {savingDescription ? 'Guardando…' : 'Guardar descripción'}
            </button>
          </div>
          {descriptionFeedback && (
            <p className={`text-xs ${descriptionFeedback.type === 'error' ? 'text-rose-300' : 'text-brand-300'}`} role={descriptionFeedback.type === 'error' ? 'alert' : 'status'}>
              {descriptionFeedback.message}
            </p>
          )}
        </div>

        <div className="space-y-3 border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-zinc-300">Icono de carga</h3>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">PNG, WebP o JPG de hasta 5 MB. Si no subes uno, se usa el predeterminado.</p>
            </div>
            <ProfileImagePicker
              alt="Icono de carga del gimnasio"
              fallback={<LoaderCircle aria-hidden="true" className="text-brand-400" size={23} />}
              imageUrl={loadingIconUrl}
              label="Subir icono"
              onUpload={uploadLoadingIcon}
              shape="icon"
            />
          </div>
          {loadingIconUrl && (
            <button
              className="min-h-9 rounded-lg border border-zinc-700 px-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
              disabled={resettingLoadingIcon}
              onClick={() => void resetLoadingIcon()}
              type="button"
            >
              {resettingLoadingIcon ? 'Restableciendo…' : 'Usar icono predeterminado'}
            </button>
          )}
          {loadingIconFeedback && (
            <p className={`text-xs ${loadingIconFeedback.type === 'error' ? 'text-rose-300' : 'text-brand-300'}`} role={loadingIconFeedback.type === 'error' ? 'alert' : 'status'}>
              {loadingIconFeedback.message}
            </p>
          )}
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
