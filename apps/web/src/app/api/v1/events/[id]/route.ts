import { UserRole, updateEventSchema } from '@community-finance/shared';
import { getEventService } from '@/server/config/container';
import { noContent, ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

export const GET = withApi({}, async (_req, ctx) => {
  const event = await getEventService().getById(ctx.auth.communityId, ctx.params.id!);
  return ok(event);
});

export const PATCH = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, updateEventSchema);
    const event = await getEventService().update(
      ctx.auth.communityId,
      ctx.params.id!,
      input,
      ctx.auth.role
    );
    return ok(event);
  }
);

export const DELETE = withApi(
  { roles: [UserRole.SUPER_ADMIN] },
  async (_req, ctx) => {
    await getEventService().remove(ctx.auth.communityId, ctx.params.id!);
    return noContent();
  }
);
