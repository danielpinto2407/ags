import { describe, expect, it } from 'vitest';
import { youtubeEmbedUrl } from '@/domain/youtubeVideo';

describe('youtubeEmbedUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=abcdefghijk&t=42', 'https://www.youtube-nocookie.com/embed/abcdefghijk'],
    ['https://youtu.be/abcdefghijk?feature=shared', 'https://www.youtube-nocookie.com/embed/abcdefghijk'],
    ['https://youtube.com/shorts/abcdefghijk', 'https://www.youtube-nocookie.com/embed/abcdefghijk'],
    ['https://m.youtube.com/live/abcdefghijk', 'https://www.youtube-nocookie.com/embed/abcdefghijk'],
    ['https://www.youtube-nocookie.com/embed/abcdefghijk', 'https://www.youtube-nocookie.com/embed/abcdefghijk'],
  ])('converts %s to a privacy-enhanced embed URL', (url, expected) => {
    expect(youtubeEmbedUrl(url)).toBe(expected);
  });

  it.each([
    null,
    '',
    'https://youtube.com/watch?v=short',
    'https://youtube.com.evil.example/watch?v=abcdefghijk',
    'javascript:alert(1)',
    'http://www.youtube.com/watch?v=abcdefghijk',
    'https://example.com/abcdefghijk',
  ])('rejects unsupported video URL %s', (url) => {
    expect(youtubeEmbedUrl(url)).toBeNull();
  });
});