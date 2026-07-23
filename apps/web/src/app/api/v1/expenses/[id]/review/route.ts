import { UserRole, reviewExpenseSchema } from '@community-finance/shared';
import { getExpenseService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

/** Approve/reject an expense. Approval updates budgets immediately. */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, reviewExpenseSchema);
    const expense = await getExpenseService().review(
      ctx.auth.communityId,
      ctx.params.id!,
      input,
      ctx.auth.sub,
      ctx.auth.role
    );
    return ok(expense);
  }
);
