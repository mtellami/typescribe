import { NextResponse } from 'next/server';
import { listFeaturedVideos } from '@/db/queries';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ videos: await listFeaturedVideos() });
  } catch (error) {
    console.error('Failed to list featured videos:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Something went wrong.' } },
      { status: 500 },
    );
  }
}
