import {
  UserRole,
  createAnnouncementSchema,
  notificationListQuerySchema,
} from '@community-finance/shared';
import { getNotificationService } from '@/server/config/container';
import { buildPaginationMeta, created, ok } from '@/server/lib/api-response';
import { parseBody, parseQuery, withApi } from '@/server/middleware/api-handler';

/** List the caller's notifications. */
export const GET = withApi({}, async (req, ctx) => {
  const query = parseQuery(req, notificationListQuerySchema);
  const { items, total } = await getNotificationService().listForUser(
    ctx.auth.communityId,
    ctx.auth.sub,
    query
  );
  return ok(items, buildPaginationMeta(query.page, query.limit, total));
});

/** Send an announcement / emergency alert (admins). */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, createAnnouncementSchema);
    await getNotificationService().send({
      communityId: ctx.auth.communityId,
      type: input.type,
      title: input.title,
      body: input.body,
      recipientIds: input.memberIds,
      createdBy: ctx.auth.sub,
    });
    return created({ sent: true });
  }
);
