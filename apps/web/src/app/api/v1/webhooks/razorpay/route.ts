import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/server/config/db';
import { getEnv } from '@/server/config/env';
import { getWebhookService } from '@/server/config/container';
import { verifyHmacSignature } from '@/server/lib/razorpay';
import { logger } from '@/server/lib/logger';

/**
 * Razorpay webhook receiver.
 * - Reads the RAW body (signature is over exact bytes).
 * - Verifies X-Razorpay-Signature (HMAC-SHA256, constant time).
 * - Delegates to WebhookService (idempotent by event id).
 *
 * Always returns 200 for verified events even if processing fails —
 * failures are recorded and retried by the daily cron, not by hammering
 * from Razorpay.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const secret = getEnv().RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !verifyHmacSignature(rawBody, signature, secret)) {
    logger.warn('Razorpay webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Razorpay's event id header; fall back to a payload hash.
  const eventId =
    req.headers.get('x-razorpay-event-id') ??
    createHash('sha256').update(rawBody).digest('hex');

  try {
    await connectDb();
    const result = await getWebhookService().process(
      eventId,
      body as Parameters<ReturnType<typeof getWebhookService>['process']>[1]
    );
    return NextResponse.json({ received: true, result });
  } catch (err) {
    logger.error({ err, eventId }, 'Webhook processing failed');
    // 200 so Razorpay doesn't retry a permanently-failing payload forever;
    // the failure is stored in WebhookEvent for the retry cron.
    return NextResponse.json({ received: true, result: 'error-recorded' });
  }
}
