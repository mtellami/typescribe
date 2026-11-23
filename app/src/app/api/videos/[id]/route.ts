import { NextResponse } from 'next/server';
import { getVideoDetail } from '@/db/queries';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const lang = new URL(request.url).searchParams.get('lang');
    const session = await auth.api.getSession({ headers: request.headers });
    const detail = await getVideoDetail(id, lang, session?.user.id);
    if (!detail) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Video not found.' } },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  } catch (error) {
    console.error('Failed to load video:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Something went wrong.' } },
      { status: 500 },
    );
  }
}
