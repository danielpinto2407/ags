import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useTenantContext } from '@/app/tenant/tenantContext';

interface TenantLoadingIndicatorProps {
  size?: number;
  className?: string;
}

export default function TenantLoadingIndicator({ size = 17, className = '' }: TenantLoadingIndicatorProps) {
  const { state } = useTenantContext();
  const loadingIconUrl = state.status === 'tenant' ? state.tenant.theme.loadingIconUrl : null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (loadingIconUrl && failedUrl !== loadingIconUrl) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={`shrink-0 animate-spin object-contain ${className}`}
        height={size}
        onError={() => setFailedUrl(loadingIconUrl)}
        src={loadingIconUrl}
        width={size}
      />
    );
  }

  return <LoaderCircle aria-hidden="true" className={`shrink-0 animate-spin text-brand-500 ${className}`} size={size} />;
}
