import { UserRole, updateIncomeSchema } from '@community-finance/shared';
import { getIncomeService } from '@/server/config/container';
import { noContent, ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

export const PATCH = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, updateIncomeSchema);
    const income = await getIncomeService().update(ctx.auth.communityId, ctx.params.id!, input);
    return ok(income);
  }
);

export const DELETE = withApi(
  { roles: [UserRole.SUPER_ADMIN] },
  async (_req, ctx) => {
    await getIncomeService().remove(ctx.auth.communityId, ctx.params.id!, ctx.auth.role);
    return noContent();
  }
);
