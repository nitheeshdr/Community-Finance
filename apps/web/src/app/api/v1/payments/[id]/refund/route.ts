import { UserRole, refundPaymentSchema } from '@community-finance/shared';
import { getPaymentService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

/** Refund a paid payment (super admin only). */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, refundPaymentSchema);
    const payment = await getPaymentService().refund(
      ctx.auth.communityId,
      ctx.params.id!,
      input.reason,
      ctx.auth.sub
    );
    return ok(payment);
  }
);
