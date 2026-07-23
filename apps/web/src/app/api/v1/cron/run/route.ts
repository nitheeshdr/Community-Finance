import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/server/config/db';
import { getEnv } from '@/server/config/env';
import { getCronService } from '@/server/config/container';
import { logger } from '@/server/lib/logger';

export const maxDuration = 60;

/**
 * Consolidated daily housekeeping — reminders, overdue marking, failed
 * payment retries, monthly close. Designed for the Vercel FREE plan with
 * NO cron dependency: the in-app lazy trigger (dashboard load) is the
 * primary scheduler. This endpoint exists as an optional external hook —
 * cron-job.org / GitHub Actions can call it with
 * `Authorization: Bearer CRON_SECRET` to cover days when nobody logs in.
 * Once-daily, race-safe either way.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}

/** Vercel Cron sends GET. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${getEnv().CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDb();
    const result = await getCronService().runDailyHousekeeping();
    return NextResponse.json({
      success: true,
      ran: result !== null,
      ...(result ? { result } : { message: 'Already ran today' }),
    });
  } catch (err) {
    logger.error({ err }, 'Cron run failed');
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
