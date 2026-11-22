import { NextResponse } from 'next/server';
import { listLibraryVideos } from '@/db/queries';

export const runtime = 'nodejs';
export async function GET() {
  try {
    return NextResponse.json({ videos: await listLibraryVideos() });
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
