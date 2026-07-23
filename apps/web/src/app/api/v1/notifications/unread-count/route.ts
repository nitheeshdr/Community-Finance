import { getNotificationService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

export const GET = withApi({}, async (_req, ctx) => {
  const count = await getNotificationService().unreadCount(ctx.auth.communityId, ctx.auth.sub);
  return ok({ count });
});
