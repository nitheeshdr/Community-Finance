import { getAuthService } from '@/server/config/container';
import { AuthError } from '@/server/errors/app-error';
import { ok } from '@/server/lib/api-response';
import { extractRefreshToken, setRefreshCookie } from '@/server/lib/auth-cookies';
import { withApi } from '@/server/middleware/api-handler';

export const POST = withApi(
  {
    auth: false,
    rateLimit: { keyPrefix: 'auth:refresh', limit: 30, windowSeconds: 15 * 60 },
  },
  async (req) => {
    const token = await extractRefreshToken(req);
    if (!token) throw new AuthError('No refresh token provided');
    const result = await getAuthService().refresh(token);
    const res = ok(result);
    setRefreshCookie(res, result.refreshToken);
    return res;
  }
);
