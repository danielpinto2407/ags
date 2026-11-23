import { useEffect, useState } from 'react';
import { LogOut, Heart, Users, Dumbbell } from 'lucide-react';
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
  const [description, setDescription] = useState(tenant?.description ?? '');
  const [savingDescription, setSavingDescription] = useState(false);
  const [descriptionFeedback, setDescriptionFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [branding, setBranding] = useState({
    primaryColor: tenant?.theme.primaryColor ?? '#7B2545',
    secondaryColor: tenant?.theme.secondaryColor ?? '#572239',
    backgroundColor: tenant?.theme.backgroundColor ?? '#F4EAE3',
    accentColor: tenant?.theme.accentColor ?? '#D8BAC4',
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingFeedback, setBrandingFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    setLogoUrl(tenant?.theme.logoUrl ?? null);
  }, [tenant?.theme.logoUrl]);

  useEffect(() => {
    setDescription(tenant?.description ?? '');
  }, [tenant?.description]);

  useEffect(() => {
    if (!tenant) return;
    setBranding({
      primaryColor: tenant.theme.primaryColor,
      secondaryColor: tenant.theme.secondaryColor,
      backgroundColor: tenant.theme.backgroundColor,
      accentColor: tenant.theme.accentColor,
    });
  }, [tenant]);

  const uploadGymLogo = async (file: File) => {
    if (!profile.tenant_id) throw new Error('No se encontró el gimnasio de esta cuenta.');
    const nextLogoUrl = await profileRepository.uploadGymLogo(file, profile.tenant_id, logoUrl);
    setLogoUrl(nextLogoUrl);
    refreshTenant();
    return nextLogoUrl;
  };

  const saveBranding = async () => {
    setSavingBranding(true);
    setBrandingFeedback(null);
    try {
      await profileRepository.setTenantBranding(branding);
      setBrandingFeedback({ type: 'success', message: 'Paleta guardada.' });
      refreshTenant();
    } catch (error) {
      setBrandingFeedback({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo guardar la paleta.' });
    } finally {
      setSavingBranding(false);
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
              className="min-h-10 rounded-lg bg-brand-500 px-4 text-xs font-bold text-white transition-colors hover:bg-brand-action-hover disabled:cursor-not-allowed disabled:opacity-60"
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
          <div>
            <p className="text-xs font-semibold text-zinc-300">Paleta del gimnasio</p>
            <p className="mt-1 text-[10px] text-zinc-500">Estos colores se aplican al entorno de tu gimnasio.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([
              ['primaryColor', 'Principal'],
              ['secondaryColor', 'Secundario'],
              ['backgroundColor', 'Fondo'],
              ['accentColor', 'Acento'],
            ] as const).map(([key, label]) => (
              <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] text-zinc-400" key={key}>
                <input
                  aria-label={label}
                  className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
                  onChange={(event) => {
                    setBranding((current) => ({ ...current, [key]: event.target.value.toUpperCase() }));
                    setBrandingFeedback(null);
                  }}
                  type="color"
                  value={branding[key]}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              className="min-h-10 rounded-lg bg-brand-500 px-4 text-xs font-bold text-white transition-colors hover:bg-brand-action-hover disabled:cursor-not-allowed disabled:opacity-60"
              disabled={savingBranding}
              onClick={() => void saveBranding()}
              type="button"
            >
              {savingBranding ? 'Guardando…' : 'Guardar paleta'}
            </button>
          </div>
          {brandingFeedback && (
            <p className={`text-xs ${brandingFeedback.type === 'error' ? 'text-rose-300' : 'text-brand-300'}`} role={brandingFeedback.type === 'error' ? 'alert' : 'status'}>
              {brandingFeedback.message}
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
