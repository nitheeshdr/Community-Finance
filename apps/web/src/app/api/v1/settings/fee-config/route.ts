import { UserRole, updateFeeConfigSchema } from '@community-finance/shared';
import { getSettingsService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

/** Current fee config + history (visible to all — transparency). */
export const GET = withApi({}, async (_req, ctx) => {
  const [current, history] = await Promise.all([
    getSettingsService().getFeeConfig(ctx.auth.communityId),
    getSettingsService().getFeeHistory(ctx.auth.communityId),
  ]);
  return ok({ current, history });
});

/** Change the monthly fee (super admin). Creates a new versioned config. */
export const PUT = withApi(
  { roles: [UserRole.SUPER_ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, updateFeeConfigSchema);
    const config = await getSettingsService().updateFeeConfig(
      ctx.auth.communityId,
      input,
      ctx.auth.sub
    );
    return ok(config);
  }
);
