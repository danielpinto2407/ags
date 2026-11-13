import { ArrowLeft, CalendarDays, UserRound } from 'lucide-react';
import ProfileMediaImage from '@/components/ProfileMediaImage';
import type { CoachMember } from '@/domain/coachMember';

interface StudentDetailProps {
  member: CoachMember;
  onBack: () => void;
}

export default function StudentDetail({ member, onBack }: StudentDetailProps) {
  const statusLabel = member.status === 'ACTIVE' ? 'Activa' : 'Inactiva';
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={16} className="text-zinc-400" />
        </button>
        <span className="font-display font-extrabold tracking-[0.15em] text-[10px] text-brand-500 uppercase">AGS Glutehouse</span>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-4">
          <ProfileMediaImage
            alt=""
            className="h-14 w-14 rounded-full bg-zinc-800 text-zinc-300"
            fallback={<UserRound size={24} />}
            src={member.avatarUrl}
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-bold text-white">{member.fullName}</h2>
            <p className="mt-1 text-xs text-zinc-400">{statusLabel}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-zinc-800 pt-4 text-xs text-zinc-400">
          <CalendarDays size={15} />
          Invitada el {new Intl.DateTimeFormat('es', { dateStyle: 'long' }).format(new Date(member.createdAt))}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-800 p-5 text-center">
        <p className="text-sm font-semibold text-zinc-300">Aún no hay una rutina personalizada asignada</p>
        <p className="mt-1 text-xs text-zinc-500">Cuando la programación se guarde por alumna, aparecerá aquí.</p>
      </div>
    </div>
  );
}
