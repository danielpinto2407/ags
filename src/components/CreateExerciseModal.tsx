import { useState } from 'react';
import { X, Check, Dumbbell } from 'lucide-react';
import type { Exercise } from '@/types';

interface CreateExerciseModalProps {
  onClose: () => void;
  onCreate: (exercise: Exercise) => void;
}

const EMOJI_OPTIONS = ['🏋️‍♀️', '🦵', '💪', '🧘‍♀️', '🤸', '🏃‍♀️', '🤾‍♀️', '🧗‍♀️', '⚡', '🔥'];

const DIFFICULTY_OPTIONS: Exercise['difficulty'][] = ['Principiante', 'Intermedio', 'Avanzado'];

export default function CreateExerciseModal({ onClose, onCreate }: CreateExerciseModalProps) {
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [tips, setTips] = useState('');
  const [muscles, setMuscles] = useState('');
  const [emoji, setEmoji] = useState('🏋️‍♀️');
  const [difficulty, setDifficulty] = useState<Exercise['difficulty']>('Intermedio');

  const canSubmit = name.trim() !== '' && muscles.trim() !== '';

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({
      id: `ex-${Date.now()}`,
      name: name.trim(),
      series: 3,
      reps: '',
      weight: '',
      rest: '',
      emoji,
      muscles: muscles.trim(),
      instructions: instructions.trim(),
      tips: tips.trim(),
      difficulty,
    });
  };

  const difficultyColors: Record<string, string> = {
    Principiante: 'text-emerald-400 border-emerald-700 bg-emerald-950/40',
    Intermedio: 'text-amber-400 border-amber-700 bg-amber-950/40',
    Avanzado: 'text-brand-400 border-brand-700 bg-brand-950/40',
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in">
      <div className="w-full max-w-[390px] bg-zinc-900 border border-zinc-800 rounded-t-[32px] p-5 animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 flex items-center justify-center">
              <Dumbbell size={18} className="text-brand-400" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">Nuevo Ejercicio</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Emoji Selector */}
        <div className="mb-4">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-2 block">Ícono</label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`flex-shrink-0 w-11 h-11 rounded-xl text-xl flex items-center justify-center border transition-all ${
                  emoji === e
                    ? 'bg-brand-600/20 border-brand-600 scale-110'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
            Nombre <span className="text-brand-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Hip Thrust con Barra"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Muscles */}
        <div className="mb-4">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
            Músculos trabajados <span className="text-brand-500">*</span>
          </label>
          <input
            type="text"
            value={muscles}
            onChange={(e) => setMuscles(e.target.value)}
            placeholder="Ej: Glúteo Mayor, Isquiotibiales"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Difficulty */}
        <div className="mb-4">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-2 block">Dificultad</label>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  difficulty === d
                    ? difficultyColors[d]
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-4">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
            Descripción / Instrucciones
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Describe cómo se ejecuta el ejercicio paso a paso..."
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
          />
        </div>

        {/* Tips */}
        <div className="mb-5">
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-1.5 block">
            Sugerencias / Puntos a cuidar
          </label>
          <textarea
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            placeholder="Ej: No arques la espalda baja. Mantén el core activado..."
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 font-bold rounded-2xl text-sm transition-all ${
              canSubmit
                ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-neon'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            <Check size={16} />
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
