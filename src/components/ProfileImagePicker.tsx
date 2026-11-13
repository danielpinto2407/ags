import { useId, useRef, useState, type ReactNode } from 'react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import ProfileMediaImage from '@/components/ProfileMediaImage';

interface ProfileImagePickerProps {
  imageUrl: string | null;
  alt: string;
  label: string;
  fallback: ReactNode;
  shape: 'circle' | 'logo';
  onUpload: (file: File) => Promise<string>;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function ProfileImagePicker({
  imageUrl,
  alt,
  label,
  fallback,
  shape,
  onUpload,
}: ProfileImagePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCircle = shape === 'circle';

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setError('Elige una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('La imagen debe pesar 5 MB o menos.');
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo guardar la imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <ProfileMediaImage
        alt={alt}
        className={`border border-zinc-700 bg-zinc-800 text-zinc-300 ${isCircle ? 'h-20 w-20 rounded-full' : 'h-20 w-36 rounded-xl'}`}
        fallback={fallback}
        imageClassName={`h-full w-full ${isCircle ? 'object-cover' : 'object-contain p-2'}`}
        src={imageUrl}
      />
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        id={inputId}
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />
      <button
        aria-describedby={error ? `${inputId}-error` : undefined}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200 transition-colors hover:border-brand-500 hover:text-white disabled:cursor-wait disabled:opacity-60"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {isUploading ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <ImagePlus aria-hidden="true" size={14} />}
        {isUploading ? 'Subiendo…' : label}
      </button>
      {error && <p className="max-w-48 text-center text-xs text-rose-400" id={`${inputId}-error`} role="alert">{error}</p>}
    </div>
  );
}
