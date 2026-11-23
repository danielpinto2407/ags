interface FeedbackMessageProps {
  kind: 'error' | 'success' | 'warning' | 'info';
  message: string;
  className?: string;
}

export default function FeedbackMessage({ kind, message, className = '' }: FeedbackMessageProps) {
  const styles = {
    error: 'border-rose-900/60 bg-rose-950/20 text-rose-300',
    success: 'border-emerald-900/50 bg-emerald-950/20 text-emerald-300',
    warning: 'border-amber-900/50 bg-amber-950/20 text-amber-300',
    info: 'border-brand-800/60 bg-brand-950/30 text-brand-200',
  };

  return (
    <p
      className={`rounded-xl border p-3 text-xs leading-relaxed ${styles[kind]} ${className}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {message}
    </p>
  );
}
