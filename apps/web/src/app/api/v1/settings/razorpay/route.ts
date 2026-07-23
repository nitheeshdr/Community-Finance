import { UserRole, updateRazorpayConfigSchema } from '@community-finance/shared';
import { getSettingsService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

/** Write-only Razorpay credential update (super admin). Keys stored encrypted. */
export const PUT = withApi(
  { roles: [UserRole.SUPER_ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, updateRazorpayConfigSchema);
    await getSettingsService().updateRazorpayConfig(ctx.auth.communityId, input);
    return ok({ configured: true });
  }
);
