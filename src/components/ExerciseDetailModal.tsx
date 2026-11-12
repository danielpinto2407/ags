import { useEffect, useRef, useState } from 'react';
import { X, Clock, Repeat, Target, Timer, Dumbbell, Lightbulb } from 'lucide-react';
import ExerciseVideoPreview from '@/components/ExerciseVideoPreview';
import type { Exercise } from '@/types';

interface ExerciseDetailModalProps {
  exercise: Exercise;
  onClose: () => void;
}

export default function ExerciseDetailModal({ exercise, onClose }: ExerciseDetailModalProps) {
  const [timer, setTimer] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const startTimer = () => {
    const seconds = parseInt(exercise.rest) || 90;
    setTimer(seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const id = setInterval(() => {
      setTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(id);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    intervalRef.current = id;
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setTimer(null);
  };

  const difficultyColors: Record<string, string> = {
    Principiante: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/50',
    Intermedio: 'text-amber-400 bg-amber-950/50 border-amber-800/50',
    Avanzado: 'text-brand-400 bg-brand-950/50 border-brand-800/50',
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in">
      <div className="w-full max-w-[390px] bg-zinc-900 border border-zinc-800 rounded-t-[32px] p-5 text-zinc-100 animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${difficultyColors[exercise.difficulty]}`}>
              {exercise.difficulty}
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white bg-zinc-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <X size={16} />
          </button>
        </div>

        <h3 className="font-display font-bold text-xl text-white mb-1">{exercise.name}</h3>
        <p className="text-xs text-zinc-500 mb-4">{exercise.muscles}</p>

        {/* Video */}
        <ExerciseVideoPreview className="mb-4" title={exercise.name} videoUrl={exercise.videoUrl} />

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
            <Repeat size={14} className="text-zinc-500 mx-auto mb-1" />
            <span className="text-[9px] text-zinc-500 block tracking-wide">SERIES</span>
            <span className="text-lg font-bold text-brand-400">{exercise.series}</span>
          </div>
          <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
            <Target size={14} className="text-zinc-500 mx-auto mb-1" />
            <span className="text-[9px] text-zinc-500 block tracking-wide">REPETICIONES</span>
            <span className="text-sm font-bold text-brand-400">{exercise.reps}</span>
          </div>
          <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
            <Dumbbell size={14} className="text-zinc-500 mx-auto mb-1" />
            <span className="text-[9px] text-zinc-500 block tracking-wide">PESO</span>
            <span className="text-sm font-bold text-brand-400">{exercise.weight}</span>
          </div>
          <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
            <Clock size={14} className="text-zinc-500 mx-auto mb-1" />
            <span className="text-[9px] text-zinc-500 block tracking-wide">DESCANSO</span>
            <span className="text-sm font-bold text-brand-400">{exercise.rest}</span>
          </div>
        </div>

        {exercise.workDuration && (
          <div className="mb-4 bg-brand-950/30 border border-brand-900/40 rounded-2xl p-3 flex items-center gap-3">
            <Timer size={16} className="text-brand-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-500 block tracking-wide">DURACIÓN DEL TRABAJO</span>
              <span className="text-sm font-bold text-brand-400">{exercise.workDuration}</span>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mb-4">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold mb-2">Instrucciones</p>
          <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800/50">
            {exercise.instructions}
          </p>
        </div>

        {/* Tips */}
        {exercise.tips && (
          <div className="mb-4">
            <p className="text-[11px] text-amber-500 uppercase tracking-wide font-semibold mb-2 flex items-center gap-1.5">
              <Lightbulb size={12} />
              Sugerencias / Puntos a cuidar
            </p>
            <p className="text-sm text-amber-200/80 leading-relaxed bg-amber-950/20 p-3.5 rounded-2xl border border-amber-900/30">
              {exercise.tips}
            </p>
          </div>
        )}

        {/* Timer */}
        <button
          onClick={timer ? stopTimer : startTimer}
          className={`w-full py-3.5 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 ${
            timer
              ? 'bg-zinc-800 text-white hover:bg-zinc-700'
              : 'bg-brand-600 hover:bg-brand-500 text-white shadow-neon'
          }`}
        >
          <Timer size={16} />
          {timer ? `Descanso: ${timer}s — Tocar para detener` : 'Iniciar Temporizador de Descanso'}
        </button>
      </div>
    </div>
  );
}
