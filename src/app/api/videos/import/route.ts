import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { importRequestSchema } from '@/lib/contracts';
import { importVideo } from '@/lib/youtube/import-service';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

function errorResponse(error: AppError) {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        retryAfterSeconds: error.retryAfterSeconds,
      },
    },
    {
      status: error.status,
      headers: error.retryAfterSeconds
        ? { 'Retry-After': String(error.retryAfterSeconds) }
        : undefined,
    },
  );
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  try {
    checkRateLimit(ip);
    const json = await request.json().catch(() => null);
    const body = importRequestSchema.safeParse(json);
    if (!body.success) {
      throw new AppError('INVALID_URL', 400, 'Enter a valid YouTube URL.');
    }
    return NextResponse.json(await importVideo(body.data.url, body.data.lang));
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error);
    return errorResponse(
      new AppError('INTERNAL', 500, 'Something went wrong.'),
    );
  }
}
