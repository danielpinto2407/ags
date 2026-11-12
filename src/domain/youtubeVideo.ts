const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

export function youtubeEmbedUrl(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;

  try {
    const url = new URL(videoUrl);
    if (url.protocol !== 'https:' || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;

    let videoId: string | null = null;
    if (url.hostname.toLowerCase() === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v');
    } else {
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(pathParts[0] ?? '')) videoId = pathParts[1] ?? null;
    }

    if (!videoId || !YOUTUBE_ID_PATTERN.test(videoId)) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}