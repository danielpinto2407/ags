import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { CoachMember, CoachMemberStatus } from '@/domain/coachMember';

interface MemberStatusToggleProps {
  member: Pick<CoachMember, 'id' | 'fullName' | 'status'>;
  onChange: (memberId: string, status: CoachMemberStatus) => Promise<void>;
}

export default function MemberStatusToggle({ member, onChange }: MemberStatusToggleProps) {
  const [confirming, setConfirming] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = member.status === 'ACTIVE';

  const confirmChange = async () => {
    setUpdating(true);
    setError(null);
    try {
      await onChange(member.id, active ? 'INACTIVE' : 'ACTIVE');
      setConfirming(false);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'No se pudo actualizar el acceso.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="relative flex shrink-0 flex-col items-end">
      <button
        aria-checked={active}
        aria-label={`${active ? 'Desactivar' : 'Activar'} a ${member.fullName}`}
        className={`relative h-5 w-9 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:cursor-wait disabled:opacity-50 ${active ? 'bg-brand-500' : 'bg-zinc-700'}`}
        disabled={updating}
        onClick={() => {
          setError(null);
          setConfirming((value) => !value);
        }}
        role="switch"
        title={active ? 'Desactivar acceso' : 'Reactivar acceso'}
        type="button"
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      {confirming && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-zinc-700 bg-zinc-950 p-2.5 shadow-xl">
          <p className="text-[11px] font-medium text-zinc-200">
            {active ? '¿Desactivar acceso?' : '¿Reactivar acceso?'}
          </p>
          {error && <p className="mt-1 text-[10px] leading-snug text-rose-300" role="alert">{error}</p>}
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              aria-label="Cancelar cambio"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
              disabled={updating}
              onClick={() => setConfirming(false)}
              title="Cancelar"
              type="button"
            >
              <X size={14} />
            </button>
            <button
              aria-label={active ? 'Confirmar desactivación' : 'Confirmar reactivación'}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-50"
              disabled={updating}
              onClick={() => void confirmChange()}
              title={updating ? 'Guardando' : 'Confirmar'}
              type="button"
            >
              <Check size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}