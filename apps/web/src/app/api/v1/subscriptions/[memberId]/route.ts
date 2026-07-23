import { UserRole, cancelSubscriptionSchema } from '@community-finance/shared';
import { getSubscriptionService } from '@/server/config/container';
import { ForbiddenError } from '@/server/errors/app-error';
import { ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

function assertSelfOrAdmin(role: UserRole, sub: string, memberId: string): void {
  const isAdmin = role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
  if (!isAdmin && memberId !== sub) throw new ForbiddenError();
}

/** Current live subscription for a member (null if none). */
export const GET = withApi({}, async (_req, ctx) => {
  assertSelfOrAdmin(ctx.auth.role, ctx.auth.sub, ctx.params.memberId!);
  const subscription = await getSubscriptionService().getForMember(
    ctx.auth.communityId,
    ctx.params.memberId!
  );
  return ok(subscription);
});

/** Cancel the member's live subscription. */
export const DELETE = withApi({}, async (req, ctx) => {
  assertSelfOrAdmin(ctx.auth.role, ctx.auth.sub, ctx.params.memberId!);
  const input = await parseBody(req, cancelSubscriptionSchema);
  const subscription = await getSubscriptionService().cancel(
    ctx.auth.communityId,
    ctx.params.memberId!,
    input.cancelAtCycleEnd,
    input.reason
  );
  return ok(subscription);
});

/** Resume (re-create) a cancelled subscription. */
export const POST = withApi({}, async (_req, ctx) => {
  assertSelfOrAdmin(ctx.auth.role, ctx.auth.sub, ctx.params.memberId!);
  const subscription = await getSubscriptionService().resume(
    ctx.auth.communityId,
    ctx.params.memberId!
  );
  return ok(subscription);
});
