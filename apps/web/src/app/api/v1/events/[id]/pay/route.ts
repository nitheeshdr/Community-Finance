import { getPaymentService } from '@/server/config/container';
import { created } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

/**
 * "Pay now" — create a Razorpay payment link for the caller's remaining
 * share of this event. Members pay for themselves; the webhook settles it.
 */
export const POST = withApi(
  { rateLimit: { keyPrefix: 'events:pay', limit: 20, windowSeconds: 15 * 60 } },
  async (_req, ctx) => {
    const link = await getPaymentService().createEventPayLink(
      ctx.auth.communityId,
      ctx.params.id!,
      ctx.auth.sub
    );
    return created(link);
  }
);
