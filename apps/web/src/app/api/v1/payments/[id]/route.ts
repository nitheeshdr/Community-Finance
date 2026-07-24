import { UserRole } from '@community-finance/shared';
import { getPaymentService } from '@/server/config/container';
import { noContent } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

/**
 * Delete a payment record (admins). Blocked for PAID payments — refund
 * those first. Useful for removing a mistaken manual/cancelled entry.
 */
export const DELETE = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (_req, ctx) => {
    await getPaymentService().remove(ctx.auth.communityId, ctx.params.id!, ctx.auth.sub);
    return noContent();
  }
);
