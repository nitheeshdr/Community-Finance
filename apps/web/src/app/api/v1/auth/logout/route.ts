import { getAuthService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { clearRefreshCookie, extractRefreshToken } from '@/server/lib/auth-cookies';
import { withApi } from '@/server/middleware/api-handler';

export const POST = withApi({ auth: false }, async (req) => {
  const token = await extractRefreshToken(req);
  await getAuthService().logout(token);
  const res = ok({ loggedOut: true });
  clearRefreshCookie(res);
  return res;
});
