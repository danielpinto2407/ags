import { Users, ChevronRight, Calendar, Dumbbell } from 'lucide-react';
import Header from '@/components/Header';
import { fitnessRepository } from '@/data/fitnessRepository';
import type { Screen } from '@/types';

interface CoachDashboardProps {
  onNavigate: (screen: Screen) => void;
  onStudentSelect: (studentId: string) => void;
}

export default function CoachDashboard({ onNavigate, onStudentSelect }: CoachDashboardProps) {
  const students = fitnessRepository.getStudents();
  const activeStudents = students.filter(s => s.status === 'active').length;
  const totalStudents = students.length;

  return (
    <div className="space-y-5">
      <Header title="Dashboard" subtitle="Panel de control" />

      {/* Stats */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-950/40 flex items-center justify-center flex-shrink-0">
          <Users size={22} className="text-brand-400" />
        </div>
        <div>
          <p className="text-2xl font-display font-bold text-white">{activeStudents}/{totalStudents}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-semibold">Alumnas activas</p>
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
          {students.slice(0, 3).map((student) => (
            <button
              key={student.id}
              onClick={() => onStudentSelect(student.id)}
              className="w-full flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">
                {student.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{student.name}</p>
                <p className="text-[11px] text-zinc-500">{student.lastActive} • {student.weeklyProgress}% completado</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  student.status === 'active' ? 'bg-emerald-500' :
                  student.status === 'resting' ? 'bg-amber-500' : 'bg-zinc-600'
                }`} />
                <ChevronRight size={16} className="text-zinc-700" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
