import { useEffect, useState } from 'react';
import { LogOut, Heart, Users } from 'lucide-react';
import Header from '@/components/Header';
import { profileRepository } from '@/data/profileRepository';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { getColombianMobileNumber, toColombianWhatsappNumber, type Profile } from '@/domain/profile';
import { useCoachMembers } from '@/app/useCoachMembers';
import CoachProfileIdentity from '@/screens/coach/profile/CoachProfileIdentity';
import CoachWhatsappSettings from '@/screens/coach/profile/CoachWhatsappSettings';
import CoachBrandingSettings, { type CoachBranding } from '@/screens/coach/profile/CoachBrandingSettings';

interface CoachProfileProps {
  profile: Profile;
  onLogout: () => void;
}

export default function CoachProfile({ profile, onLogout }: CoachProfileProps) {
  const { state } = useCoachMembers(profile.id);
  const { state: tenantState, refresh: refreshTenant } = useTenantContext();
  const tenant = tenantState.status === 'tenant' ? tenantState.tenant : null;
  const [logoUrl, setLogoUrl] = useState<string | null>(tenant?.theme.logoUrl ?? null);
  const [description, setDescription] = useState(tenant?.description ?? '');
  const [savingDescription, setSavingDescription] = useState(false);
  const [descriptionFeedback, setDescriptionFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savedWhatsappNumber, setSavedWhatsappNumber] = useState('');
  const [legacyWhatsappNumber, setLegacyWhatsappNumber] = useState<string | null>(null);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [whatsappFeedback, setWhatsappFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [whatsappAvatarPath, setWhatsappAvatarPath] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(true);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [branding, setBranding] = useState<CoachBranding>({
    primaryColor: tenant?.theme.primaryColor ?? '#71717A',
    secondaryColor: tenant?.theme.secondaryColor ?? '#52525B',
    backgroundColor: tenant?.theme.backgroundColor ?? '#09090B',
    accentColor: tenant?.theme.accentColor ?? '#A1A1AA',
    surfaceColor: tenant?.theme.surfaceColor ?? '#18181B',
    textColor: tenant?.theme.textColor ?? '#FAFAFA',
    mutedColor: tenant?.theme.mutedColor ?? '#A1A1AA',
    borderColor: tenant?.theme.borderColor ?? '#27272A',
    warmAccentColor: tenant?.theme.warmAccentColor ?? '#A1A1AA',
    softAccentColor: tenant?.theme.softAccentColor ?? '#52525B',
    bodyFont: tenant?.theme.bodyFont ?? 'DM Sans',
    displayFont: tenant?.theme.displayFont ?? 'Fraunces',
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingFeedback, setBrandingFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    setLogoUrl(tenant?.theme.logoUrl ?? null);
  }, [tenant?.theme.logoUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoadingWhatsapp(true);
    profileRepository.getOwnCoachWhatsappNumber(profile.id)
      .then((number) => {
        if (cancelled) return;
        const localNumber = getColombianMobileNumber(number);
        setWhatsappNumber(localNumber ?? '');
        setSavedWhatsappNumber(localNumber ?? '');
        setLegacyWhatsappNumber(localNumber === null ? number : null);
      })
      .catch((error: unknown) => {
        if (!cancelled) setWhatsappFeedback({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo cargar tu número de WhatsApp.' });
      })
      .finally(() => { if (!cancelled) setLoadingWhatsapp(false); });
    return () => { cancelled = true; };
  }, [profile.id]);

  useEffect(() => {
    let cancelled = false;
    setAvatarLoading(true);
    profileRepository.getTenantWhatsappAvatar()
      .then((path) => { if (!cancelled) setWhatsappAvatarPath(path); })
      .catch((error: unknown) => { if (!cancelled) setAvatarError(error instanceof Error ? error.message : 'No se pudo cargar el avatar.'); })
      .finally(() => { if (!cancelled) setAvatarLoading(false); });
    return () => { cancelled = true; };
  }, [profile.tenant_id]);

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
      surfaceColor: tenant.theme.surfaceColor,
      textColor: tenant.theme.textColor,
      mutedColor: tenant.theme.mutedColor,
      borderColor: tenant.theme.borderColor,
      warmAccentColor: tenant.theme.warmAccentColor,
      softAccentColor: tenant.theme.softAccentColor,
      bodyFont: tenant.theme.bodyFont,
      displayFont: tenant.theme.displayFont,
    });
  }, [tenant]);

  const uploadGymLogo = async (file: File) => {
    if (!profile.tenant_id) throw new Error('No se encontró el gimnasio de esta cuenta.');
    const nextLogoUrl = await profileRepository.uploadGymLogo(file, profile.tenant_id, logoUrl);
    setLogoUrl(nextLogoUrl);
    await refreshTenant();
    return nextLogoUrl;
  };

  const uploadWhatsappAvatar = async (file: File) => {
    if (!profile.tenant_id) throw new Error('No se encontró el gimnasio de esta cuenta.');
    const path = await profileRepository.setTenantWhatsappAvatar(file, profile.tenant_id, whatsappAvatarPath);
    setWhatsappAvatarPath(path);
    setAvatarError(null);
    return profileRepository.getPublicMediaUrl(path) ?? '';
  };

  const removeWhatsappAvatar = async () => {
    if (!profile.tenant_id) return;
    setAvatarRemoving(true);
    setAvatarError(null);
    try {
      await profileRepository.setTenantWhatsappAvatar(null, profile.tenant_id, whatsappAvatarPath);
      setWhatsappAvatarPath(null);
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'No se pudo quitar el avatar.');
    } finally {
      setAvatarRemoving(false);
    }
  };

  const brandingIsValid = Object.entries(branding).every(([key, value]) =>
    key.endsWith('Font') || /^#[0-9A-Fa-f]{6}$/.test(value)
  );

  const saveBranding = async () => {
    setSavingBranding(true);
    setBrandingFeedback(null);
    try {
      await profileRepository.setTenantBranding(branding);
      setBrandingFeedback({ type: 'success', message: 'Paleta guardada.' });
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
    } catch (error) {
      setDescriptionFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo guardar la descripción.',
      });
    } finally {
      setSavingDescription(false);
    }
  };

  const saveWhatsapp = async (remove = false) => {
    setSavingWhatsapp(true);
    setWhatsappFeedback(null);
    try {
      const number = await profileRepository.setOwnCoachWhatsappNumber(!remove && whatsappNumber ? toColombianWhatsappNumber(whatsappNumber) : '');
      const localNumber = getColombianMobileNumber(number) ?? '';
      setWhatsappNumber(localNumber);
      setSavedWhatsappNumber(localNumber);
      setLegacyWhatsappNumber(null);
      setWhatsappFeedback({ type: 'success', message: 'Número de WhatsApp guardado.' });
    } catch (error) {
      setWhatsappFeedback({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo guardar tu número de WhatsApp.' });
    } finally {
      setSavingWhatsapp(false);
    }
  };

  return (
    <div className="space-y-5">
      <Header title="Mi Perfil" showBell={false} showLogo={false} />

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5">
        <CoachProfileIdentity
          gymName={tenant?.name ?? 'Perfil del gimnasio'}
          logoUrl={logoUrl}
          name={profile.full_name}
          onUploadLogo={uploadGymLogo}
        />

        <CoachWhatsappSettings
          tenantId={profile.tenant_id ?? ''}
          number={whatsappNumber}
          savedNumber={savedWhatsappNumber}
          legacyNumber={legacyWhatsappNumber}
          loadingNumber={loadingWhatsapp}
          savingNumber={savingWhatsapp}
          numberFeedback={whatsappFeedback}
          avatarPath={whatsappAvatarPath}
          avatarLoading={avatarLoading}
          avatarRemoving={avatarRemoving}
          avatarError={avatarError}
          onNumberChange={(value) => { setWhatsappNumber(value); setWhatsappFeedback(null); }}
          onSaveNumber={(remove) => void saveWhatsapp(remove)}
          onUploadAvatar={uploadWhatsappAvatar}
          onRemoveAvatar={() => void removeWhatsappAvatar()}
        />

        <CoachBrandingSettings
          description={description}
          descriptionLength={description.length}
          descriptionFeedback={descriptionFeedback}
          savingDescription={savingDescription}
          branding={branding}
          brandingValid={brandingIsValid}
          savingBranding={savingBranding}
          brandingFeedback={brandingFeedback}
          onDescriptionChange={(value) => { setDescription(value); setDescriptionFeedback(null); }}
          onSaveDescription={() => void saveDescription()}
          onBrandingChange={(key, value) => {
            setBranding((current) => ({ ...current, [key]: key.endsWith('Font') ? value : value.startsWith('#') ? value : `#${value}` }));
            setBrandingFeedback(null);
          }}
          onSaveBranding={() => void saveBranding()}
        />

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
