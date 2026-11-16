import { NextResponse } from 'next/server';
import { getVideoDetail } from '@/db/queries';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const lang = new URL(request.url).searchParams.get('lang');
    const detail = await getVideoDetail(id, lang);
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
