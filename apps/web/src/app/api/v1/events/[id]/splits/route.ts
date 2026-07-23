import { getEventService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

/** Per-member budget split for an event (transparency: visible to all). */
export const GET = withApi({}, async (_req, ctx) => {
  const splits = await getEventService().getSplits(ctx.auth.communityId, ctx.params.id!);
  return ok(splits);
});
