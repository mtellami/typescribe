import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { parseYouTubeUrl } from '@/lib/youtube/url';
import { getVideoPreview } from '@/lib/youtube/video-preview';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session)
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Log in to preview a video.',
          },
        },
        { status: 401 },
      );
    const url = new URL(request.url).searchParams.get('url');
    if (!url || url.length > 2048)
      throw new AppError('INVALID_URL', 400, 'Enter a valid YouTube URL.');
    const id = parseYouTubeUrl(url);
    return NextResponse.json(
      { video: await getVideoPreview(id, request.signal) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    if (error instanceof AppError)
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_FAILED',
          message: 'We couldn’t preview this video. Try another link.',
        },
      },
      { status: 502 },
    );
  }
}
