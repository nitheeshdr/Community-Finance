import {
  UserRole,
  createEventSchema,
  eventListQuerySchema,
} from '@community-finance/shared';
import { getEventService } from '@/server/config/container';
import { buildPaginationMeta, created, ok } from '@/server/lib/api-response';
import { parseBody, parseQuery, withApi } from '@/server/middleware/api-handler';

/** List events (all roles — transparency). */
export const GET = withApi({}, async (req, ctx) => {
  const query = parseQuery(req, eventListQuerySchema);
  const { items, total } = await getEventService().list(ctx.auth.communityId, query);
  return ok(items, buildPaginationMeta(query.page, query.limit, total));
});

/** Create an event; splits calculate immediately. */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, createEventSchema);
    const event = await getEventService().create(
      ctx.auth.communityId,
      input,
      ctx.auth.sub,
      ctx.auth.role
    );
    return created(event);
  }
);
