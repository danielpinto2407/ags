import { useState } from 'react';
import { Search, ChevronRight, Plus } from 'lucide-react';
import Header from '@/components/Header';
import InviteMemberModal from '@/components/InviteMemberModal';
import { fitnessRepository } from '@/data/fitnessRepository';
import type { Student } from '@/types';

interface CoachStudentsProps {
  onStudentSelect: (studentId: string) => void;
}

export default function CoachStudents({ onStudentSelect }: CoachStudentsProps) {
  const students = fitnessRepository.getStudents();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'resting' | 'inactive'>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const filtered = students.filter((s) => {
    const matchesQuery = s.name.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || s.status === filter;
    return matchesQuery && matchesFilter;
  });

  const filterTabs: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: 'Todas', count: students.length },
    { key: 'active', label: 'Activas', count: students.filter(s => s.status === 'active').length },
    { key: 'resting', label: 'En descanso', count: students.filter(s => s.status === 'resting').length },
    { key: 'inactive', label: 'Inactivas', count: students.filter(s => s.status === 'inactive').length },
  ];

  const statusConfig: Record<Student['status'], { label: string; color: string; dot: string }> = {
    active: { label: 'Activa', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40', dot: 'bg-emerald-500' },
    resting: { label: 'Descanso', color: 'text-amber-400 bg-amber-950/40 border-amber-800/40', dot: 'bg-amber-500' },
    inactive: { label: 'Inactiva', color: 'text-zinc-400 bg-zinc-800/40 border-zinc-700/40', dot: 'bg-zinc-600' },
  };

  return (
    <div className="space-y-4">
      <Header title="Mis Alumnas" subtitle={`${students.length} alumnas`} />

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
        {filtered.map((student) => {
          const status = statusConfig[student.status];
          return (
            <button
              key={student.id}
              onClick={() => onStudentSelect(student.id)}
              className="w-full flex items-center gap-3 p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800/50 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0">
                {student.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white truncate">{student.name}</p>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot} flex-shrink-0`} />
                </div>
                <p className="text-[11px] text-zinc-500">{student.goal}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="text-[10px] text-zinc-600">{student.lastActive}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-brand-400">{student.weeklyProgress}%</p>
                <p className="text-[9px] text-zinc-600">cumplimiento</p>
              </div>
              <ChevronRight size={16} className="text-zinc-700 flex-shrink-0" />
            </button>
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

      {showInviteModal && <InviteMemberModal onClose={() => setShowInviteModal(false)} />}
    </div>
  );
}
