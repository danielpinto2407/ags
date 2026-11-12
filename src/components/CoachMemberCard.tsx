import { Mail } from 'lucide-react';
import MemberStatusToggle from '@/components/MemberStatusToggle';
import type { CoachMember, CoachMemberStatus } from '@/domain/coachMember';

interface CoachMemberCardProps {
  member: CoachMember;
  onSelect: (member: CoachMember) => void;
  onStatusChange: (memberId: string, status: CoachMemberStatus) => Promise<void>;
}

function memberInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('');
}

export default function CoachMemberCard({ member, onSelect, onStatusChange }: CoachMemberCardProps) {
  const active = member.status === 'ACTIVE';

  return (
    <article className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
      <button
        aria-label={`Ver perfil de ${member.fullName}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={() => onSelect(member)}
        type="button"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-950/30 text-sm font-bold text-brand-300">
          {memberInitials(member.fullName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-bold text-white">{member.fullName}</span>
            <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${active
              ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-300'
              : 'border-zinc-700/50 bg-zinc-800/40 text-zinc-500'
            }`}>
              {active ? 'Activa' : 'Inactiva'}
            </span>
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-zinc-400">
            <Mail aria-hidden="true" className="shrink-0 text-zinc-500" size={10} />
            <span className="truncate">{member.email ?? 'Correo no disponible'}</span>
          </span>
          <span className="mt-1 block text-[10px] text-zinc-500">Sin programación activa</span>
        </span>
      </button>
      <MemberStatusToggle member={member} onChange={onStatusChange} />
    </article>
  );
}