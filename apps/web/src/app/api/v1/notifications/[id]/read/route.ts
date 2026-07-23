import { getNotificationService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

export const POST = withApi({}, async (_req, ctx) => {
  await getNotificationService().markRead(ctx.auth.communityId, ctx.auth.sub, ctx.params.id!);
  return ok({ read: true });
});
