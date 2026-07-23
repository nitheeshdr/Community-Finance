import { UserRole, updateSettingsSchema } from '@community-finance/shared';
import { getSettingsService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

export const GET = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (_req, ctx) => {
    const settings = await getSettingsService().get(ctx.auth.communityId);
    return ok(settings);
  }
);

export const PATCH = withApi(
  { roles: [UserRole.SUPER_ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, updateSettingsSchema);
    const settings = await getSettingsService().update(ctx.auth.communityId, input);
    return ok(settings);
  }
);
