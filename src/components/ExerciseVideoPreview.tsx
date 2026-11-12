import { ExternalLink, Play } from 'lucide-react';
import { youtubeEmbedUrl } from '@/domain/youtubeVideo';

interface ExerciseVideoPreviewProps {
  videoUrl: string | null | undefined;
  title: string;
  className?: string;
}

function safeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function isYouTubeHost(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'youtube.com'
      || hostname.endsWith('.youtube.com')
      || hostname === 'youtu.be'
      || hostname === 'youtube-nocookie.com'
      || hostname.endsWith('.youtube-nocookie.com');
  } catch {
    return false;
  }
}

export default function ExerciseVideoPreview({ videoUrl, title, className = '' }: ExerciseVideoPreviewProps) {
  const embedUrl = youtubeEmbedUrl(videoUrl);

  if (embedUrl) {
    return (
      <div className={`aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 ${className}`}>
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={embedUrl}
          title={`Video: ${title}`}
        />
      </div>
    );
  }

  if (!videoUrl) {
    return <p className={`text-[10px] text-zinc-500 ${className}`}>Sin video disponible</p>;
  }

  const externalUrl = safeHttpsUrl(videoUrl);
  if (!externalUrl || isYouTubeHost(videoUrl)) {
    return <p className={`text-[10px] text-zinc-500 ${className}`}>El enlace de video no es válido</p>;
  }

  return (
    <a
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-600 underline underline-offset-2 ${className}`}
      href={externalUrl}
      rel="noreferrer"
      target="_blank"
    >
      <Play aria-hidden="true" size={12} />
      Abrir video externo
      <ExternalLink aria-hidden="true" size={12} />
    </a>
  );
}