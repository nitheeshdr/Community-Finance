import {
  UserRole,
  paymentListQuerySchema,
  recordManualPaymentSchema,
} from '@community-finance/shared';
import { getPaymentService } from '@/server/config/container';
import { buildPaginationMeta, created, ok } from '@/server/lib/api-response';
import { parseBody, parseQuery, withApi } from '@/server/middleware/api-handler';

/**
 * List payments. Members see everything except other members' personal
 * fields (transparency rule) — payment records are community-public.
 */
export const GET = withApi({}, async (req, ctx) => {
  const query = parseQuery(req, paymentListQuerySchema);
  const { items, total } = await getPaymentService().list(ctx.auth.communityId, query);
  return ok(items, buildPaginationMeta(query.page, query.limit, total));
});

/** Record a manual cash/UPI payment (admins). Enters the approval queue. */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, recordManualPaymentSchema);
    const payment = await getPaymentService().recordManual(ctx.auth.communityId, input, ctx.auth.sub);
    return created(payment);
  }
);
