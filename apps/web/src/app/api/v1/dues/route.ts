import { UserRole, periodSchema } from '@community-finance/shared';
import { z } from 'zod';
import { getDuesService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseQuery, withApi } from '@/server/middleware/api-handler';

const querySchema = z.object({ period: periodSchema });

/** Subscription dues for a month — who has paid and who hasn't (admins). */
export const GET = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const { period } = parseQuery(req, querySchema);
    const dues = await getDuesService().duesForPeriod(ctx.auth.communityId, period);
    return ok(dues);
  }
);
