import { Mail, UserRound } from 'lucide-react';
import MemberStatusToggle from '@/components/MemberStatusToggle';
import ProfileMediaImage from '@/components/ProfileMediaImage';
import type { CoachMember, CoachMemberStatus } from '@/domain/coachMember';

interface CoachMemberCardProps {
  member: CoachMember;
  onSelect: (member: CoachMember) => void;
  onStatusChange: (memberId: string, status: CoachMemberStatus) => Promise<void>;
}

export default function CoachMemberCard({ member, onSelect, onStatusChange }: CoachMemberCardProps) {
  const active = member.status === 'ACTIVE';

  return (
    <article className="flex items-center gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900 p-2.5">
      <button
        aria-label={`Ver perfil de ${member.fullName}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        onClick={() => onSelect(member)}
        type="button"
      >
        <ProfileMediaImage
          alt=""
          className="h-9 w-9 rounded-full bg-brand-950/30 text-brand-300"
          fallback={<UserRound size={17} />}
          src={member.avatarUrl}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold text-white">{member.fullName}</span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-zinc-400">
            <Mail aria-hidden="true" className="shrink-0 text-zinc-500" size={10} />
            <span className="truncate">{member.email ?? 'Correo no disponible'}</span>
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-1 text-[10px]">
            <span className={`shrink-0 font-medium ${active ? 'text-brand-600' : 'text-zinc-500'}`}>
              {active ? 'Activa' : 'Inactiva'}
            </span>
            <span aria-hidden="true" className="text-zinc-500">·</span>
            <span className="truncate text-zinc-500">
              {member.hasActiveProgramming ? 'Con programación activa' : 'Sin programación activa'}
            </span>
          </span>
        </span>
      </button>
      <MemberStatusToggle member={member} onChange={onStatusChange} />
    </article>
  );
}