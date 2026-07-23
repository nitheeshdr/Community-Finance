import { getPaymentService } from '@/server/config/container';
import { created } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

/**
 * "Pay now" for an existing pending due (monthly subscription, event
 * contribution, retry of a failed AutoPay charge). Members pay their own
 * dues one-time via a Razorpay payment link; the webhook settles it.
 */
export const POST = withApi(
  { rateLimit: { keyPrefix: 'payments:pay', limit: 20, windowSeconds: 15 * 60 } },
  async (_req, ctx) => {
    const link = await getPaymentService().payPendingPayment(
      ctx.auth.communityId,
      ctx.params.id!,
      ctx.auth.sub
    );
    return created(link);
  }
);
