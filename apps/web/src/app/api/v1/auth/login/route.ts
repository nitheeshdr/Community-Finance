import { loginSchema } from '@community-finance/shared';
import { getAuthService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { setRefreshCookie } from '@/server/lib/auth-cookies';
import { parseBody, withApi } from '@/server/middleware/api-handler';

export const POST = withApi(
  {
    auth: false,
    rateLimit: { keyPrefix: 'auth:login', limit: 10, windowSeconds: 15 * 60 },
  },
  async (req) => {
    const { phone, password } = await parseBody(req, loginSchema);
    const result = await getAuthService().login(phone, password);
    const res = ok(result);
    setRefreshCookie(res, result.refreshToken);
    return res;
  }
);
