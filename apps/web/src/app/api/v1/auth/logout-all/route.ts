import { getAuthService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { clearRefreshCookie } from '@/server/lib/auth-cookies';
import { withApi } from '@/server/middleware/api-handler';

/** "Logout everywhere" — revokes every active session for the caller. */
export const POST = withApi({}, async (_req, ctx) => {
  const revoked = await getAuthService().logoutEverywhere(ctx.auth.sub);
  const res = ok({ revokedSessions: revoked });
  clearRefreshCookie(res);
  return res;
});
