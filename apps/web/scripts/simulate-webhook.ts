/**
 * Razorpay webhook simulator for local testing (no real gateway needed).
 *
 * Usage:
 *   npm run simulate:webhook -- subscription.charged <razorpaySubscriptionId> [amountRupees]
 *   npm run simulate:webhook -- payment.failed <razorpaySubscriptionId> [amountRupees]
 *
 * Signs the payload with RAZORPAY_WEBHOOK_SECRET from .env and POSTs it to
 * the local webhook endpoint, exercising the full settlement pipeline
 * (payment row, income, receipt, splits, notifications, audit).
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../.env.local'), override: true });

import { createHmac, randomUUID } from 'node:crypto';

async function main() {
  const [event = 'subscription.charged', subscriptionId, amountArg] = process.argv.slice(2);
  if (!subscriptionId) {
    console.error(
      'Usage: npm run simulate:webhook -- <event> <razorpaySubscriptionId> [amountRupees]'
    );
    process.exit(1);
  }
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set in .env');
    process.exit(1);
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const amountPaise = Math.round(Number(amountArg ?? 300) * 100);

  const body = JSON.stringify({
    entity: 'event',
    event,
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      subscription: {
        entity: {
          id: subscriptionId,
          status: event === 'subscription.charged' ? 'active' : 'halted',
          charge_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        },
      },
      payment: {
        entity: {
          id: `pay_sim_${randomUUID().slice(0, 12)}`,
          amount: amountPaise,
          status: event === 'payment.failed' ? 'failed' : 'captured',
          error_description:
            event === 'payment.failed' ? 'Simulated failure: UPI mandate declined' : undefined,
        },
      },
    },
  });

  const signature = createHmac('sha256', secret).update(body).digest('hex');

  const res = await fetch(`${baseUrl}/api/v1/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': signature,
      'X-Razorpay-Event-Id': `evt_sim_${randomUUID().slice(0, 12)}`,
    },
    body,
  });

  console.log(`→ ${event} for ${subscriptionId} (₹${amountPaise / 100})`);
  console.log(`← ${res.status}:`, await res.text());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
