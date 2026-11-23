import TenantLoadingIndicator from '@/components/TenantLoadingIndicator';

interface LoadingStateProps {
  message: string;
  size?: number;
  compact?: boolean;
  className?: string;
}

export default function LoadingState({
  message,
  size = 17,
  compact = false,
  className = '',
}: LoadingStateProps) {
  return (
    <div
      className={`flex items-center justify-center gap-2 text-sm ${compact ? 'py-4' : 'py-10'} ${className}`}
      role="status"
      style={{ color: 'var(--tenant-muted, #A1A1AA)' }}
    >
      <TenantLoadingIndicator size={size} />
      {message}
    </div>
  );
}
