import { NextResponse } from 'next/server';
import { listLibraryVideos } from '@/db/queries';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session)
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED' } },
        { status: 401 },
      );
    return NextResponse.json({
      videos: await listLibraryVideos(session.user.id),
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL',
          message: 'Could not load the video library.',
        },
      },
      { status: 500 },
    );
  }
}
