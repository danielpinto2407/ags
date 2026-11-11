import { ChartNoAxesColumnIncreasing } from 'lucide-react';
import Header from '@/components/Header';

export default function StudentProgress() {
  return (
    <div className="space-y-4">
      <Header title="Mi Progreso" subtitle="Historial de entrenamiento" showBell={false} />
      <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-12 text-center">
        <ChartNoAxesColumnIncreasing className="mx-auto mb-3 text-zinc-600" size={27} />
        <p className="text-sm font-semibold text-zinc-300">Aún no hay progreso registrado</p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
          El historial aparecerá cuando esté disponible el registro de entrenamientos completados.
        </p>
      </div>
    </div>
  );
}
