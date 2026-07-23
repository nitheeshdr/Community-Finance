import { UserRole, updateExpenseSchema } from '@community-finance/shared';
import { getExpenseService } from '@/server/config/container';
import { noContent, ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

export const PATCH = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, updateExpenseSchema);
    const expense = await getExpenseService().update(ctx.auth.communityId, ctx.params.id!, input);
    return ok(expense);
  }
);

export const DELETE = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (_req, ctx) => {
    await getExpenseService().remove(ctx.auth.communityId, ctx.params.id!, ctx.auth.role);
    return noContent();
  }
);
