import { AppError } from '@/lib/errors';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
]);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new AppError('INVALID_URL', 400, 'Enter a valid YouTube URL.');
  }

  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    throw new AppError('INVALID_URL', 400, 'Only YouTube URLs are supported.');
  }

  let id: string | null = null;
  if (url.hostname === 'youtu.be') {
    id = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v');
  } else if (/^\/(shorts|embed|live)\//.test(url.pathname)) {
    id = url.pathname.split('/').filter(Boolean)[1] ?? null;
  }

  if (!id || !VIDEO_ID.test(id)) {
    throw new AppError(
      'INVALID_URL',
      400,
      'Could not find a YouTube video ID in that URL.',
    );
  }
  return id;
}
