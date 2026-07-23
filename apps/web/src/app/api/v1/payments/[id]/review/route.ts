import { UserRole, approvePaymentSchema } from '@community-finance/shared';
import { getPaymentService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

/** Approve or reject a pending manual payment. Approval settles it. */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, approvePaymentSchema);
    const payment = await getPaymentService().review(
      ctx.auth.communityId,
      ctx.params.id!,
      input,
      ctx.auth.sub
    );
    return ok(payment);
  }
);
