import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Building2, Dumbbell, LogOut, Mail, RefreshCw, Save, Plus, UserPlus } from 'lucide-react';
import StatusToggle from '@/components/StatusToggle';
import FeedbackMessage from '@/components/FeedbackMessage';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import {
  platformEquipmentRepository,
  type PlatformTenant,
  type TenantEquipmentOption,
  type CoachProfile,
  type CoachInvitation,
} from '@/data/platformEquipmentRepository';
import type { Profile } from '@/domain/profile';
import { PLATFORM_TENANT_THEME } from '@/domain/tenant';

interface PlatformEquipmentAdminProps {
  profile: Profile;
  onLogout: () => void;
}

export default function PlatformEquipmentAdmin({ profile, onLogout }: PlatformEquipmentAdminProps) {
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [options, setOptions] = useState<TenantEquipmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'tenants' | 'equipment' | 'coaches'>('tenants');
  const [tenantDraft, setTenantDraft] = useState({ name: '', subdomain: '', description: '', status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' });
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [coachDraft, setCoachDraft] = useState({ fullName: '', email: '' });
  const [coachProfiles, setCoachProfiles] = useState<CoachProfile[]>([]);
  const [coachInvitations, setCoachInvitations] = useState<CoachInvitation[]>([]);

  const loadTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await platformEquipmentRepository.listTenants();
      setTenants(data);
      setSelectedTenantId((current) => current || data[0]?.id || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los gimnasios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTenants(); }, []);

  useEffect(() => {
    if (activeSection !== 'coaches' || !selectedTenantId) return;
    let cancelled = false;
    setLoading(true);
    platformEquipmentRepository.listCoachInvitations(selectedTenantId)
      .then((result) => {
        if (cancelled) return;
        setCoachProfiles(result.coaches);
        setCoachInvitations(result.invitations);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el estado de los coaches.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeSection, selectedTenantId]);

  useEffect(() => {
    if (!selectedTenantId) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    platformEquipmentRepository.listOptions(selectedTenantId)
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
        setDraftNames(Object.fromEntries(data.map((option) => [option.id, option.name])));
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los equipos.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTenantId]);

  const reloadOptions = async () => {
    if (!selectedTenantId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await platformEquipmentRepository.listOptions(selectedTenantId);
      setOptions(data);
      setDraftNames(Object.fromEntries(data.map((option) => [option.id, option.name])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los equipos.');
    } finally {
      setLoading(false);
    }
  };

  const createOption = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingId('new');
    setError(null);
    setNotice(null);
    try {
      await platformEquipmentRepository.createOption(selectedTenantId, newName);
      setNewName('');
      setNotice('Equipo agregado.');
      await reloadOptions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo agregar el equipo.');
    } finally {
      setSavingId(null);
    }
  };

  const renameOption = async (option: TenantEquipmentOption) => {
    setSavingId(option.id);
    setError(null);
    setNotice(null);
    try {
      await platformEquipmentRepository.renameOption(option.id, selectedTenantId, draftNames[option.id] ?? option.name);
      setNotice('Nombre actualizado.');
      await reloadOptions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo actualizar el equipo.');
    } finally {
      setSavingId(null);
    }
  };

  const setArchived = async (option: TenantEquipmentOption, archived: boolean) => {
    setSavingId(option.id);
    setError(null);
    setNotice(null);
    try {
      await platformEquipmentRepository.setArchived(option.id, selectedTenantId, archived);
      setNotice(archived ? 'Equipo archivado.' : 'Equipo restaurado.');
      await reloadOptions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo cambiar el estado del equipo.');
    } finally {
      setSavingId(null);
    }
  };

  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;

  const startEditTenant = (tenant: PlatformTenant) => {
    setEditingTenantId(tenant.id);
    setTenantDraft({ name: tenant.name, subdomain: tenant.subdomain, description: tenant.description, status: tenant.status });
  };

  const createOrUpdateTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingId('tenant');
    setError(null);
    setNotice(null);
    try {
      if (editingTenantId) {
        await platformEquipmentRepository.updateTenant({
          id: editingTenantId,
          name: tenantDraft.name,
          subdomain: tenantDraft.subdomain,
          description: tenantDraft.description,
          status: tenantDraft.status,
        });
        setNotice('Gimnasio actualizado.');
      } else {
        await platformEquipmentRepository.createTenant({
          name: tenantDraft.name,
          subdomain: tenantDraft.subdomain,
          description: tenantDraft.description,
        });
        setNotice('Gimnasio creado.');
      }
      setEditingTenantId(null);
      setTenantDraft({ name: '', subdomain: '', description: '', status: 'ACTIVE' });
      await loadTenants();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el gimnasio.');
    } finally {
      setSavingId(null);
    }
  };

  const provisionCoach = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTenantId) return;
    setSavingId('coach');
    setError(null);
    setNotice(null);
    try {
      await platformEquipmentRepository.provisionCoach({
        tenantId: selectedTenantId,
        email: coachDraft.email,
        fullName: coachDraft.fullName,
      });
      setCoachDraft({ fullName: '', email: '' });
      setNotice('Coach invitado. Recibirá un correo para activar su acceso.');
      const lifecycle = await platformEquipmentRepository.listCoachInvitations(selectedTenantId);
      setCoachProfiles(lifecycle.coaches);
      setCoachInvitations(lifecycle.invitations);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo crear el coach.');
    } finally {
      setSavingId(null);
    }
  };

  const resendCoachInvitation = async (invitationId: string) => {
    setSavingId(invitationId);
    setError(null);
    setNotice(null);
    try {
      await platformEquipmentRepository.resendCoachInvitation(selectedTenantId, invitationId);
      const lifecycle = await platformEquipmentRepository.listCoachInvitations(selectedTenantId);
      setCoachProfiles(lifecycle.coaches);
      setCoachInvitations(lifecycle.invitations);
      setNotice('Invitación reenviada.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo reenviar la invitación.');
    } finally {
      setSavingId(null);
    }
  };

  const setCoachStatus = async (coachId: string, active: boolean) => {
    await platformEquipmentRepository.setCoachStatus(coachId, active);
    const lifecycle = await platformEquipmentRepository.listCoachInvitations(selectedTenantId);
    setCoachProfiles(lifecycle.coaches);
    setCoachInvitations(lifecycle.invitations);
  };

  const latestInvitationsByEmail = Array.from(
    new Map(
      [...coachInvitations]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((invitation) => [invitation.email.toLowerCase(), invitation])
    ).values()
  );

  const cancelCoachInvitation = async (invitationId: string) => {
    setSavingId(invitationId);
    setError(null);
    setNotice(null);
    try {
      await platformEquipmentRepository.cancelCoachInvitation(selectedTenantId, invitationId);
      const lifecycle = await platformEquipmentRepository.listCoachInvitations(selectedTenantId);
      setCoachProfiles(lifecycle.coaches);
      setCoachInvitations(lifecycle.invitations);
      setNotice('Invitación cancelada.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo cancelar la invitación.');
    } finally {
      setSavingId(null);
    }
  };

  const platformStyle: CSSProperties = {
    '--tenant-primary': PLATFORM_TENANT_THEME.primaryColor,
    '--tenant-on-primary': '#FAFAFA',
    '--tenant-secondary': PLATFORM_TENANT_THEME.secondaryColor,
    '--tenant-background': PLATFORM_TENANT_THEME.backgroundColor,
    '--tenant-accent': PLATFORM_TENANT_THEME.accentColor,
    '--tenant-surface': PLATFORM_TENANT_THEME.surfaceColor,
    '--tenant-text': PLATFORM_TENANT_THEME.textColor,
    '--tenant-muted': PLATFORM_TENANT_THEME.mutedColor,
    '--tenant-border': PLATFORM_TENANT_THEME.borderColor,
    '--tenant-warm-accent': PLATFORM_TENANT_THEME.warmAccentColor,
    '--tenant-soft-accent': PLATFORM_TENANT_THEME.softAccentColor,
    '--tenant-body-font': `"${PLATFORM_TENANT_THEME.bodyFont}"`,
    '--tenant-display-font': `"${PLATFORM_TENANT_THEME.displayFont}"`,
  } as CSSProperties;

  return (
    <main className="platform-admin min-h-screen bg-zinc-950 px-4 py-5 text-zinc-100 sm:px-6" style={platformStyle}>
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-300">Panel de plataforma</p>
            <h1 className="mt-1 text-xl font-bold text-white">Equipos por gimnasio</h1>
            <p className="mt-1 text-xs text-zinc-400">{profile.full_name}</p>
          </div>
          <button
            aria-label="Cerrar sesión"
            className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white"
            onClick={onLogout}
            type="button"
          >
            <LogOut size={17} />
          </button>
        </header>

        <nav className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1" aria-label="Gestión de plataforma">
          {([
            ['tenants', 'Gimnasios', Building2],
            ['equipment', 'Equipos', Dumbbell],
            ['coaches', 'Coaches', UserPlus],
          ] as const).map(([section, label, Icon]) => (
            <button
              className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold ${activeSection === section ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'}`}
              key={section}
              onClick={() => {
                setActiveSection(section);
                setError(null);
                setNotice(null);
              }}
              type="button"
            >
              <Icon aria-hidden="true" size={14} /> {label}
            </button>
          ))}
        </nav>

        {activeSection === 'tenants' && (
          <section className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
            <aside className="rounded-xl border border-zinc-800 bg-zinc-900 p-2">
              {tenants.map((tenant) => (
                <button
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left ${selectedTenantId === tenant.id ? 'bg-brand-950/50 text-brand-200' : 'text-zinc-300 hover:bg-zinc-800'}`}
                  key={tenant.id}
                  onClick={() => { setSelectedTenantId(tenant.id); startEditTenant(tenant); }}
                  type="button"
                >
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{tenant.name}</span><span className="block truncate text-[10px] text-zinc-500">{tenant.subdomain}</span></span>
                </button>
              ))}
            </aside>
            <div>
              {error && <FeedbackMessage kind="error" message={error} className="mb-3" />}
              {notice && <FeedbackMessage kind="info" message={notice} className="mb-3" />}
              <form className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4" onSubmit={(event) => void createOrUpdateTenant(event)}>
                <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold text-white">{editingTenantId ? 'Editar gimnasio' : 'Nuevo gimnasio'}</h2>{editingTenantId && <button className="text-xs text-zinc-400 hover:text-white" onClick={() => { setEditingTenantId(null); setTenantDraft({ name:'', subdomain:'', description:'', status:'ACTIVE' }); }} type="button">Cancelar</button>}</div>
                <input aria-label="Nombre del gimnasio" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none" maxLength={120} placeholder="Nombre del gimnasio" value={tenantDraft.name} onChange={(event) => setTenantDraft((current) => ({ ...current, name: event.target.value }))} />
                <input aria-label="Subdominio" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none" maxLength={63} placeholder="subdominio" value={tenantDraft.subdomain} onChange={(event) => setTenantDraft((current) => ({ ...current, subdomain: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'') }))} />
                <textarea aria-label="Descripción" className="min-h-24 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none" maxLength={280} placeholder="Descripción" value={tenantDraft.description} onChange={(event) => setTenantDraft((current) => ({ ...current, description: event.target.value }))} />
                {editingTenantId && <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-300">Estado<select className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white" value={tenantDraft.status} onChange={(event) => setTenantDraft((current) => ({ ...current, status: event.target.value as 'ACTIVE' | 'SUSPENDED' }))}><option value="ACTIVE">Activo</option><option value="SUSPENDED">Suspendido</option></select></label>}
                <button className="min-h-11 w-full rounded-xl bg-brand-500 px-4 text-sm font-bold text-white hover:bg-brand-action-hover disabled:opacity-50" disabled={savingId === 'tenant' || !tenantDraft.name.trim() || !tenantDraft.subdomain.trim()} type="submit">{editingTenantId ? 'Guardar cambios' : 'Crear gimnasio'}</button>
              </form>
            </div>
          </section>
        )}

        {activeSection === 'coaches' && (
          <section className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="text-sm font-bold text-white">Invitar coach administrador</h2>
            {error && <FeedbackMessage kind="error" message={error} className="mt-3" />}
            {notice && <FeedbackMessage kind="info" message={notice} className="mt-3" />}
            <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void provisionCoach(event)}>
              <label className="text-xs font-semibold text-zinc-400">Gimnasio<select className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white" value={selectedTenantId} onChange={(event) => setSelectedTenantId(event.target.value)}><option value="">Selecciona un gimnasio</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
              <input aria-label="Nombre del coach" className="mt-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white sm:mt-[18px]" placeholder="Nombre completo" value={coachDraft.fullName} onChange={(event) => setCoachDraft((current) => ({ ...current, fullName: event.target.value }))} />
              <input aria-label="Correo del coach" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white sm:col-span-2" type="email" placeholder="correo@ejemplo.com" value={coachDraft.email} onChange={(event) => setCoachDraft((current) => ({ ...current, email: event.target.value }))} />
              <button className="min-h-11 rounded-xl bg-brand-500 px-4 text-sm font-bold text-white hover:bg-brand-action-hover disabled:opacity-50 sm:col-span-2" disabled={!selectedTenantId || savingId === 'coach' || coachDraft.fullName.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coachDraft.email)} type="submit"><UserPlus className="mr-2 inline" size={16} />Enviar invitación</button>
            </form>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Invitaciones</h3>
                {coachInvitations.length === 0 ? (
                  <EmptyState icon={Mail} title="No hay invitaciones registradas" compact />
                ) : (
                  <div className="mt-3 space-y-2">
                    {latestInvitationsByEmail.map((invitation) => (
                      <div className="rounded-lg border border-zinc-800 p-3" key={invitation.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{invitation.email}</p>
                            <p className="mt-1 text-[10px] text-zinc-500">{invitation.status} · {invitation.resendCount} reenvío(s)</p>
                          </div>
                          {invitation.status === 'PENDING' && (
                            <div className="flex shrink-0 gap-1">
                              <button className="rounded-lg border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-50" disabled={savingId !== null} onClick={() => void resendCoachInvitation(invitation.id)} type="button"><RefreshCw className="mr-1 inline" size={11} />Reenviar</button>
                              <button className="rounded-lg border border-rose-900/70 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-950/30 disabled:opacity-50" disabled={savingId !== null} onClick={() => void cancelCoachInvitation(invitation.id)} type="button">Cancelar</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Coaches</h3>
                {coachProfiles.length === 0 ? (
                  <EmptyState icon={UserPlus} title="No hay coaches registrados" compact />
                ) : (
                  <div className="mt-3 space-y-2">
                    {coachProfiles.map((coach) => (
                      <div className="flex items-center justify-between rounded-lg border border-zinc-800 p-3" key={coach.id}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{coach.fullName}</p>
                          <span className={`mt-1 block text-[10px] font-bold ${coach.status === 'ACTIVE' ? 'text-emerald-300' : 'text-rose-300'}`}>{coach.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}</span>
                        </div>
                        <StatusToggle
                          itemName={coach.fullName}
                          active={coach.status === 'ACTIVE'}
                          activeLabel="Activo"
                          inactiveLabel="Suspendido"
                          confirmActiveTitle="Desactivar coach"
                          confirmInactiveTitle="Reactivar coach"
                          onChange={(active) => setCoachStatus(coach.id, active)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeSection === 'equipment' && (
          loading && tenants.length === 0 ? (
          <LoadingState message="Cargando gimnasios…" />
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
            <aside className="rounded-xl border border-zinc-800 bg-zinc-900 p-2">
              {tenants.map((tenant) => (
                <button
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left ${selectedTenantId === tenant.id ? 'bg-brand-950/50 text-brand-200' : 'text-zinc-300 hover:bg-zinc-800'}`}
                  key={tenant.id}
                  onClick={() => setSelectedTenantId(tenant.id)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{tenant.name}</span>
                    <span className="block truncate text-[10px] text-zinc-500">{tenant.subdomain}</span>
                  </span>
                </button>
              ))}
            </aside>

            <section className="min-w-0">
              {selectedTenant && (
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Gimnasio seleccionado</p>
                    <h2 className="mt-1 text-base font-bold text-white">{selectedTenant.name}</h2>
                  </div>
                  <button
                    aria-label="Recargar equipos"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                    onClick={() => void reloadOptions()}
                    type="button"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              )}

              {error && <FeedbackMessage kind="error" message={error} className="mb-3" />}
              {notice && <FeedbackMessage kind="info" message={notice} className="mb-3" />}

              <form className="mb-3 flex gap-2" onSubmit={(event) => void createOption(event)}>
                <input
                  aria-label="Nombre del equipo"
                  className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-brand-500 focus:outline-none"
                  maxLength={80}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Ej: Prensa de piernas"
                  value={newName}
                />
                <button
                  aria-label="Agregar equipo"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-500 text-white hover:bg-brand-action-hover disabled:opacity-50"
                  disabled={!selectedTenantId || !newName.trim() || savingId === 'new'}
                  type="submit"
                >
                  <Plus size={17} />
                </button>
              </form>

              {loading ? (
                <LoadingState compact message="Cargando equipos…" />
              ) : (
                <div className="space-y-2">
                  {options.map((option) => (
                    <article className={`flex items-center gap-2 rounded-xl border p-3 ${option.archivedAt ? 'border-zinc-800 bg-zinc-900/50 opacity-70' : 'border-brand-800/50 bg-brand-950/20'}`} key={option.id}>
                      <Dumbbell aria-hidden="true" className="shrink-0 text-brand-300" size={16} />
                      <input
                        aria-label={`Nombre de ${option.name}`}
                        className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                        maxLength={80}
                        onChange={(event) => setDraftNames((current) => ({ ...current, [option.id]: event.target.value }))}
                        value={draftNames[option.id] ?? option.name}
                      />
                      <button
                        aria-label={`Guardar ${option.name}`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-zinc-800 text-brand-300 hover:bg-brand-950/40 disabled:opacity-50"
                        disabled={savingId === option.id || draftNames[option.id] === option.name}
                        onClick={() => void renameOption(option)}
                        type="button"
                      >
                        <Save size={14} />
                      </button>
                      <StatusToggle
                        itemName={option.name}
                        active={!option.archivedAt}
                        activeLabel="Activo"
                        inactiveLabel="Archivado"
                        confirmActiveTitle="Archivar equipo"
                        confirmInactiveTitle="Restaurar equipo"
                        onChange={(active) => setArchived(option, !active)}
                      />
                    </article>
                  ))}
                  {options.length === 0 && <EmptyState icon={Dumbbell} title="Este gimnasio no tiene opciones configuradas" compact />}
                </div>
              )}
            </section>
          </div>
          )
        )}
      </div>
    </main>
  );
}
