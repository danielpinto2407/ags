import { useState, type ReactNode } from 'react';

interface ProfileMediaImageProps {
  src: string | null;
  alt: string;
  fallback: ReactNode;
  className: string;
  imageClassName?: string;
}

export default function ProfileMediaImage({
  src,
  alt,
  fallback,
  className,
  imageClassName = 'h-full w-full object-cover',
}: ProfileMediaImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showImage = Boolean(src && failedSource !== src);

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
      {showImage
        ? <img alt={alt} className={imageClassName} onError={() => setFailedSource(src)} src={src ?? undefined} />
        : <span aria-hidden="true">{fallback}</span>}
    </span>
  );
}