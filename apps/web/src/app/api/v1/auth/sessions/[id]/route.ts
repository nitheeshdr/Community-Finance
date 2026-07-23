import { getAuthService } from '@/server/config/container';
import { noContent } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

/** Revoke a specific session (log out that device). */
export const DELETE = withApi({}, async (_req, ctx) => {
  await getAuthService().revokeSession(ctx.auth.sub, ctx.params.id!);
  return noContent();
});
