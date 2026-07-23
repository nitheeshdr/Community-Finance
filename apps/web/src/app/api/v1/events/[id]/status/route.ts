import { UserRole, changeEventStatusSchema } from '@community-finance/shared';
import { getEventService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

/** Activate / complete / close / cancel an event. */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, changeEventStatusSchema);
    const event = await getEventService().changeStatus(
      ctx.auth.communityId,
      ctx.params.id!,
      input
    );
    return ok(event);
  }
);
