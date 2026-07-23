import { AUTH } from '@community-finance/shared';
import { getAuthService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

/** Device tracking: list the caller's active sessions. */
export const GET = withApi({}, async (req, ctx) => {
  const current = req.cookies.get(AUTH.REFRESH_COOKIE_NAME)?.value ?? null;
  const sessions = await getAuthService().listSessions(ctx.auth.sub, current);
  return ok(sessions);
});
