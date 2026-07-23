import {
  UserRole,
  createIncomeSchema,
  incomeListQuerySchema,
} from '@community-finance/shared';
import { getIncomeService } from '@/server/config/container';
import { buildPaginationMeta, created, ok } from '@/server/lib/api-response';
import { parseBody, parseQuery, withApi } from '@/server/middleware/api-handler';

/** List income records (all roles — transparency). */
export const GET = withApi({}, async (req, ctx) => {
  const query = parseQuery(req, incomeListQuerySchema);
  const { items, total } = await getIncomeService().list(ctx.auth.communityId, query);
  return ok(items, buildPaginationMeta(query.page, query.limit, total));
});

/** Record manual income (donation, sponsorship, temple, misc). */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, createIncomeSchema);
    const income = await getIncomeService().create(ctx.auth.communityId, input, ctx.auth.sub);
    return created(income);
  }
);
