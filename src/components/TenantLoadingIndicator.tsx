import { LoaderCircle } from 'lucide-react';

interface TenantLoadingIndicatorProps {
  size?: number;
  className?: string;
}

export default function TenantLoadingIndicator({ size = 17, className = '' }: TenantLoadingIndicatorProps) {
  return <LoaderCircle aria-hidden="true" className={`shrink-0 animate-spin text-brand-500 ${className}`} size={size} />;
}
