import { changePasswordSchema } from '@community-finance/shared';
import { getAuthService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { clearRefreshCookie } from '@/server/lib/auth-cookies';
import { parseBody, withApi } from '@/server/middleware/api-handler';

export const POST = withApi(
  { rateLimit: { keyPrefix: 'auth:change-password', limit: 5, windowSeconds: 15 * 60 } },
  async (req, ctx) => {
    const input = await parseBody(req, changePasswordSchema);
    await getAuthService().changePassword(
      ctx.auth.communityId,
      ctx.auth.sub,
      input.currentPassword,
      input.newPassword
    );
    // All sessions are revoked server-side; force re-login on this device too.
    const res = ok({ changed: true });
    clearRefreshCookie(res);
    return res;
  }
);
