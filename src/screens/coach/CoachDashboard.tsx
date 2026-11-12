import { Users, Calendar, Dumbbell } from 'lucide-react';
import Header from '@/components/Header';
import CoachMemberCard from '@/components/CoachMemberCard';
import type { Screen } from '@/types';
import type { Profile } from '@/domain/profile';
import { useCoachMembers } from '@/app/useCoachMembers';
import type { CoachMember } from '@/domain/coachMember';

interface CoachDashboardProps {
  profile: Profile;
  onNavigate: (screen: Screen) => void;
  onStudentSelect: (member: CoachMember) => void;
}

export default function CoachDashboard({ profile, onNavigate, onStudentSelect }: CoachDashboardProps) {
  const { state, setMemberStatus } = useCoachMembers(profile.id);
  const members = state.members;
  const activeMembers = members.filter((member) => member.status === 'ACTIVE').length;

  return (
    <div className="space-y-5">
      <Header title="Dashboard" subtitle={`Hola, ${profile.full_name}`} />

      {/* Stats */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-950/40 flex items-center justify-center flex-shrink-0">
          <Users size={22} className="text-brand-400" />
        </div>
        <div>
          <p className="text-2xl font-display font-bold text-white">
            {state.status === 'loading' ? '…' : `${activeMembers}/${members.length}`}
          </p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-semibold">Alumnas invitadas activas</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold mb-3">Acciones rápidas</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('programRoutine')}
            className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-4 text-left hover:scale-[1.02] transition-transform"
          >
            <Calendar size={20} className="text-white mb-2" />
            <p className="text-sm font-bold text-white">Programar Rutina</p>
            <p className="text-[11px] text-brand-100">Asignar a alumnas</p>
          </button>
          <button
            onClick={() => onNavigate('exerciseLibrary')}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:bg-zinc-800 transition-colors"
          >
            <Dumbbell size={20} className="text-brand-400 mb-2" />
            <p className="text-sm font-bold text-white">Biblioteca</p>
            <p className="text-[11px] text-zinc-500">Ejercicios</p>
          </button>
        </div>
      </div>

      {/* Recent Students */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Alumnas recientes</p>
          <button onClick={() => onNavigate('students')} className="text-xs text-brand-400 hover:text-brand-300">
            Ver todas
          </button>
        </div>
        <div className="space-y-2">
          {members.slice(0, 3).map((member) => (
            <CoachMemberCard key={member.id} member={member} onSelect={onStudentSelect} onStatusChange={setMemberStatus} />
          ))}
          {state.status === 'error' && <p className="text-xs text-rose-400">No se pudo cargar el roster de alumnas.</p>}
          {state.status === 'loaded' && members.length === 0 && (
            <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-xs text-zinc-500">
              Las alumnas aparecerán aquí cuando acepten tu invitación.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
