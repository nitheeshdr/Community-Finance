import { UserRole, createSubscriptionSchema } from '@community-finance/shared';
import { getSubscriptionService } from '@/server/config/container';
import { ForbiddenError } from '@/server/errors/app-error';
import { created } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

/**
 * Create a Razorpay AutoPay subscription. Admins can create for any
 * member; members only for themselves.
 */
export const POST = withApi({}, async (req, ctx) => {
  const input = await parseBody(req, createSubscriptionSchema);
  const isAdmin = ctx.auth.role === UserRole.SUPER_ADMIN || ctx.auth.role === UserRole.ADMIN;
  if (!isAdmin && input.memberId !== ctx.auth.sub) {
    throw new ForbiddenError('You can only create a subscription for yourself');
  }
  const subscription = await getSubscriptionService().createForMember(
    ctx.auth.communityId,
    input.memberId
  );
  return created(subscription);
});
