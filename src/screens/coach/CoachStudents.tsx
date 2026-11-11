import { useState } from 'react';
import { Search, ChevronRight, Plus, RefreshCw, Users, Mail } from 'lucide-react';
import Header from '@/components/Header';
import InviteMemberModal from '@/components/InviteMemberModal';
import MemberStatusToggle from '@/components/MemberStatusToggle';
import { useCoachMembers } from '@/app/useCoachMembers';
import type { CoachMember, CoachMemberStatus } from '@/domain/coachMember';

interface CoachStudentsProps {
  coachId: string;
  onStudentSelect: (member: CoachMember) => void;
}

function memberInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('');
}

export default function CoachStudents({ coachId, onStudentSelect }: CoachStudentsProps) {
  const { state, reload, setMemberStatus } = useCoachMembers(coachId);
  const members = state.members;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | CoachMemberStatus>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const filtered = members.filter((member) => {
    const matchesQuery = member.fullName.toLocaleLowerCase().includes(query.toLocaleLowerCase());
    const matchesFilter = filter === 'all' || member.status === filter;
    return matchesQuery && matchesFilter;
  });

  const filterTabs: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: 'Todas', count: members.length },
    { key: 'ACTIVE', label: 'Activas', count: members.filter((member) => member.status === 'ACTIVE').length },
    { key: 'INACTIVE', label: 'Inactivas', count: members.filter((member) => member.status === 'INACTIVE').length },
  ];

  const statusConfig: Record<CoachMemberStatus, { label: string; color: string; dot: string }> = {
    ACTIVE: { label: 'Activa', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40', dot: 'bg-emerald-500' },
    INACTIVE: { label: 'Inactiva', color: 'text-zinc-400 bg-zinc-800/40 border-zinc-700/40', dot: 'bg-zinc-600' },
  };

  return (
    <div className="space-y-4">
      <Header title="Mis Alumnas" subtitle={state.status === 'loading' ? 'Cargando alumnas' : `${members.length} alumnas`} />

      {state.status === 'error' && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-900/60 bg-rose-950/20 p-3" role="alert">
          <p className="text-sm text-rose-300">{state.message}</p>
          <button aria-label="Reintentar carga" className="rounded-lg p-2 text-rose-300 hover:bg-rose-950/50" onClick={reload} type="button">
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          type="text"
          placeholder="Buscar alumna..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Student List */}
      <div className="space-y-2">
          {state.status === 'loading' && members.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500" role="status">Cargando alumnas invitadas…</p>
          )}
          {state.status === 'loaded' && members.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center">
              <Users className="mx-auto mb-3 text-zinc-600" size={24} />
              <p className="text-sm font-semibold text-zinc-300">Aún no tienes alumnas</p>
              <p className="mt-1 text-xs text-zinc-500">Las alumnas aparecerán aquí cuando acepten tu invitación.</p>
            </div>
          )}
          {filtered.map((member) => {
          const status = statusConfig[member.status];
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3"
            >
              <button
                aria-label={`Ver perfil de ${member.fullName}`}
                className="flex flex-1 min-w-0 items-center gap-3 text-left"
                onClick={() => onStudentSelect(member)}
                type="button"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300 flex-shrink-0">
                  {memberInitials(member.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white truncate">{member.fullName}</p>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot} flex-shrink-0`} />
                  </div>
                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    <Mail size={11} className="shrink-0 text-zinc-500" />
                    <span className="truncate text-[10px] text-zinc-400">{member.email ?? 'Correo no disponible'}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="text-[10px] text-zinc-500">Sin programación activa</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-700 flex-shrink-0" />
              </button>
              <MemberStatusToggle member={member} onChange={setMemberStatus} />
            </div>
          );
        })}
      </div>

      {/* Add Student */}
      <button
        className="w-full flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:text-brand-400 hover:border-brand-800 transition-colors text-sm font-semibold"
        onClick={() => setShowInviteModal(true)}
      >
        <Plus size={16} />
        Invitar alumna
      </button>

      {showInviteModal && (
        <InviteMemberModal
          onClose={() => {
            setShowInviteModal(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
