import { getDuesService } from '@/server/config/container';
import { ForbiddenError } from '@/server/errors/app-error';
import { UserRole } from '@community-finance/shared';
import { ok } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

/**
 * A member's month-by-month subscription ledger (paid/unpaid). Admins can
 * view anyone; a member may view their own.
 */
export const GET = withApi({}, async (_req, ctx) => {
  const isAdmin = ctx.auth.role === UserRole.SUPER_ADMIN || ctx.auth.role === UserRole.ADMIN;
  if (!isAdmin && ctx.params.id !== ctx.auth.sub) {
    throw new ForbiddenError('You can only view your own payment history');
  }
  const ledger = await getDuesService().memberLedger(ctx.auth.communityId, ctx.params.id!);
  return ok(ledger);
});
