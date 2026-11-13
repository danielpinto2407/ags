import { useEffect, useState } from 'react';
import { LogOut, Heart } from 'lucide-react';
import Header from '@/components/Header';
import { profileRepository } from '@/data/profileRepository';
import type { Profile } from '@/domain/profile';

interface StudentProfileProps {
  profile: Profile;
  onLogout: () => void;
}

export default function StudentProfile({ profile, onLogout }: StudentProfileProps) {
  const [coachName, setCoachName] = useState<string | null>(null);
  const [coachInfoStatus, setCoachInfoStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  useEffect(() => {
    let cancelled = false;
    if (profile.role !== 'user_personalized') {
      setCoachInfoStatus('loaded');
      return () => { cancelled = true; };
    }

    setCoachInfoStatus('loading');
    profileRepository.getOwnCoachName()
      .then((name) => {
        if (cancelled) return;
        setCoachName(name);
        setCoachInfoStatus('loaded');
      })
      .catch(() => {
        if (!cancelled) setCoachInfoStatus('error');
      });

    return () => { cancelled = true; };
  }, [profile.id, profile.role]);

  return (
    <div className="space-y-3 pb-1">
      <Header title="Mi Perfil" showBell={false} />

      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-brand-800/50 bg-brand-600/20 text-2xl">
            👩
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-display font-bold text-white">{profile.full_name}</h2>
            <span className="mt-1 inline-block rounded-full border border-brand-900/50 bg-brand-950/50 px-2 py-0.5 text-[10px] font-semibold text-brand-400">
              {profile.role === 'user_personalized' ? 'Plan Personalizado' : 'Perfil'}
            </span>
          </div>
        </div>

        <p className="border-t border-zinc-800 pt-3 text-[11px] leading-relaxed text-zinc-500">
            Tu progreso y medidas aparecerán aquí cuando haya registros disponibles.
        </p>
        <div className="mt-3 flex items-center gap-2.5 border-t border-zinc-800 pt-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600/20 text-lg">💪</div>
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-500">Tu coach</p>
            <p className="truncate text-sm font-bold text-white" aria-live="polite">
              {coachInfoStatus === 'loading'
                ? 'Cargando…'
                : coachInfoStatus === 'error'
                  ? 'Información no disponible'
                  : coachName ?? 'Sin coach asignado'}
            </p>
          </div>
        </div>
      </section>

      <button onClick={onLogout} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm font-semibold text-brand-400 transition-colors hover:bg-brand-950/30">
        <LogOut size={16} />
        Cerrar Sesión
      </button>

      <p className="flex items-center justify-center gap-1 pb-1 text-center text-[10px] text-zinc-700">
        AGS Glutehouse v1.0 • Hecho con <Heart size={10} className="text-brand-700" />
      </p>
    </div>
  );
}
