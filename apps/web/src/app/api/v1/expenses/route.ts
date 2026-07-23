import {
  UserRole,
  createExpenseSchema,
  expenseListQuerySchema,
} from '@community-finance/shared';
import { getExpenseService } from '@/server/config/container';
import { buildPaginationMeta, created, ok } from '@/server/lib/api-response';
import { parseBody, parseQuery, withApi } from '@/server/middleware/api-handler';

/** List expenses (all roles — transparency). */
export const GET = withApi({}, async (req, ctx) => {
  const query = parseQuery(req, expenseListQuerySchema);
  const { items, total } = await getExpenseService().list(ctx.auth.communityId, query);
  return ok(items, buildPaginationMeta(query.page, query.limit, total));
});

/** Add an expense (admins). Bills mandatory above the configured threshold. */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, createExpenseSchema);
    const expense = await getExpenseService().create(ctx.auth.communityId, input, ctx.auth.sub);
    return created(expense);
  }
);
