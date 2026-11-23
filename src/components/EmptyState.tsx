import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  compact = false,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed text-center ${compact ? 'px-4 py-5' : 'px-5 py-10'} ${className}`}
      style={{ borderColor: 'var(--tenant-border, #27272A)', backgroundColor: 'var(--tenant-surface, #18181B)' }}
      role="status"
    >
      <Icon
        aria-hidden="true"
        className="mx-auto mb-3"
        size={compact ? 19 : 24}
        style={{ color: 'var(--tenant-primary, #71717A)' }}
      />
      <p className="text-sm font-semibold" style={{ color: 'var(--tenant-text, #FAFAFA)' }}>{title}</p>
      {description && (
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--tenant-muted, #A1A1AA)' }}>{description}</p>
      )}
    </div>
  );
}
