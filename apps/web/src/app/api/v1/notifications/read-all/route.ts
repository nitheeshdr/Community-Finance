import { getNotificationService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

export const POST = withApi({}, async (_req, ctx) => {
  await getNotificationService().markAllRead(ctx.auth.communityId, ctx.auth.sub);
  return ok({ read: true });
});
