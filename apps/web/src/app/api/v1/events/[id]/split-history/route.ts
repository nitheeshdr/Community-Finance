import { getEventService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

/** Recalculation history for an event's budget split. */
export const GET = withApi({}, async (_req, ctx) => {
  const history = await getEventService().getSplitHistory(ctx.auth.communityId, ctx.params.id!);
  return ok(history);
});
