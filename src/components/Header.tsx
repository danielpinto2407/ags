import { Bell, Dumbbell } from 'lucide-react';
import { useTenantContext } from '@/app/tenant/tenantContext';
import ProfileMediaImage from '@/components/ProfileMediaImage';
import StudentWhatsappContact from '@/components/StudentWhatsappContact';
import { useAuth } from '@/app/session/authContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  showBell?: boolean;
  onBellClick?: () => void;
}

export default function Header({ title, subtitle, showLogo = true, showBell = false, onBellClick }: HeaderProps) {
  const { state: tenantState } = useTenantContext();
  const { state: authState } = useAuth();
  const tenant = tenantState.status === 'tenant' ? tenantState.tenant : null;
  const isStudent = authState.status === 'authenticated' && authState.productRole === 'student';

  return (
    <div className={`mb-5 flex items-start justify-between gap-2 ${isStudent ? 'sticky top-0 z-30 pb-2' : ''}`} style={isStudent ? { backgroundColor: 'var(--tenant-background)' } : undefined}>
      <div className="min-w-0 flex-1">
        {showLogo && (
          <div className="mb-1 flex h-10 items-center gap-2.5">
            <ProfileMediaImage
              alt={tenant?.name ?? 'Gimnasio'}
              className="h-10 w-10 text-brand-500"
              fallback={<Dumbbell aria-hidden="true" size={20} />}
              imageClassName="h-full w-full object-contain"
              src={tenant?.theme.logoUrl ?? null}
            />
            <span className="font-display font-extrabold tracking-[0.15em] text-[10px] text-brand-400 uppercase" style={{ textShadow: '0 0 8px color-mix(in srgb, var(--tenant-accent) 28%, transparent)' }}>
              {tenant?.name ?? 'AGS Glutehouse'}
            </span>
          </div>
        )}
        <h1 className="text-2xl font-display font-bold text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {isStudent && <StudentWhatsappContact />}
      {showBell && onBellClick && (
        <button
          aria-label="Notificaciones"
          onClick={onBellClick}
          className="relative w-9 h-9 rounded-full bg-zinc-900 border border-brand-500/30 flex items-center justify-center hover:bg-zinc-800 transition-colors"
        >
          <Bell size={16} className="text-zinc-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" style={{ boxShadow: '0 0 6px color-mix(in srgb, var(--tenant-primary) 38%, transparent)' }} />
        </button>
      )}
    </div>
  );
}
