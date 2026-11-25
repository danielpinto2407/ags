import FeedbackMessage from '@/components/FeedbackMessage';
import AppInput from '@/components/AppInput';
import AppTextarea from '@/components/AppTextarea';

interface PlatformTenantsSectionProps {
  error: string | null;
  notice: string | null;
  editingTenantId: string | null;
  tenantDraft: { name: string; subdomain: string; description: string; status: 'ACTIVE' | 'SUSPENDED' };
  saving: boolean;
  onCancelEdit: () => void;
  onDraftChange: (key: 'name' | 'subdomain' | 'description' | 'status', value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export default function PlatformTenantsSection(props: PlatformTenantsSectionProps) {
  return (
    <div>
      {props.error && <FeedbackMessage kind="error" message={props.error} className="mb-3" />}
      {props.notice && <FeedbackMessage kind="info" message={props.notice} className="mb-3" />}
      <form className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4" onSubmit={props.onSubmit}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white">{props.editingTenantId ? 'Editar gimnasio' : 'Nuevo gimnasio'}</h2>
          {props.editingTenantId && <button className="text-xs text-zinc-400 hover:text-white" onClick={props.onCancelEdit} type="button">Cancelar</button>}
        </div>
        <AppInput aria-label="Nombre del gimnasio" className="w-full px-3 py-2.5" maxLength={120} placeholder="Nombre del gimnasio" value={props.tenantDraft.name} onChange={(event) => props.onDraftChange('name', event.target.value)} />
        <AppInput aria-label="Subdominio" className="w-full px-3 py-2.5" maxLength={63} placeholder="subdominio" value={props.tenantDraft.subdomain} onChange={(event) => props.onDraftChange('subdomain', event.target.value)} />
        <AppTextarea aria-label="Descripción" className="min-h-24 w-full resize-y px-3 py-2.5" maxLength={280} placeholder="Descripción" value={props.tenantDraft.description} onChange={(event) => props.onDraftChange('description', event.target.value)} />
        {props.editingTenantId && (
          <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-300">
            Estado
            <select className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white" value={props.tenantDraft.status} onChange={(event) => props.onDraftChange('status', event.target.value)}>
              <option value="ACTIVE">Activo</option>
              <option value="SUSPENDED">Suspendido</option>
            </select>
          </label>
        )}
        <button className="min-h-11 w-full rounded-xl bg-brand-500 px-4 text-sm font-bold text-white hover:bg-brand-action-hover disabled:opacity-50" disabled={props.saving || !props.tenantDraft.name.trim() || !props.tenantDraft.subdomain.trim()} type="submit">
          {props.editingTenantId ? 'Guardar cambios' : 'Crear gimnasio'}
        </button>
      </form>
    </div>
  );
}
