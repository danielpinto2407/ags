import { useState } from 'react';
import { Search, Plus, Dumbbell } from 'lucide-react';
import Header from '@/components/Header';
import CreateExerciseModal from '@/components/CreateExerciseModal';
import { fitnessRepository } from '@/data/fitnessRepository';
import type { Exercise } from '@/types';

export default function CoachExerciseLibrary() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'Principiante' | 'Intermedio' | 'Avanzado'>('all');
  const [exercises, setExercises] = useState<Exercise[]>(() => fitnessRepository.getExercises());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = exercises.filter((ex) => {
    const matchesQuery = ex.name.toLowerCase().includes(query.toLowerCase()) ||
      ex.muscles.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || ex.difficulty === filter;
    return matchesQuery && matchesFilter;
  });

  const handleCreate = (exercise: Exercise) => {
    setExercises((prev) => [exercise, ...prev]);
    setShowCreateModal(false);
  };

  const difficultyColors: Record<string, string> = {
    Principiante: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
    Intermedio: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
    Avanzado: 'text-brand-400 bg-brand-950/40 border-brand-800/40',
  };

  const filterTabs = ['all', 'Principiante', 'Intermedio', 'Avanzado'] as const;

  return (
    <div className="space-y-4">
      <Header title="Biblioteca" subtitle={`${exercises.length} ejercicios`} />

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          type="text"
          placeholder="Buscar ejercicio o músculo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${
              filter === tab
                ? 'bg-brand-600 text-white'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            {tab === 'all' ? 'Todos' : tab}
          </button>
        ))}
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((ex) => (
          <div key={ex.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 hover:bg-zinc-800/50 transition-colors">
            <div className="w-full h-20 bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-xl flex items-center justify-center text-3xl mb-3 border border-zinc-800">
              {ex.emoji}
            </div>
            <p className="text-sm font-bold text-white leading-tight">{ex.name}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{ex.muscles}</p>
            <span className={`inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full border font-semibold ${difficultyColors[ex.difficulty]}`}>
              {ex.difficulty}
            </span>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-8 text-center">
          <Dumbbell size={32} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No se encontraron ejercicios</p>
        </div>
      )}

      {/* Add Exercise Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:text-brand-400 hover:border-brand-800 transition-colors text-sm font-semibold"
      >
        <Plus size={16} />
        Crear nuevo ejercicio
      </button>

      {showCreateModal && (
        <CreateExerciseModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
