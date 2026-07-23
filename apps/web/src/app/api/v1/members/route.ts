import {
  UserRole,
  createMemberSchema,
  memberListQuerySchema,
} from '@community-finance/shared';
import { getMemberService } from '@/server/config/container';
import { buildPaginationMeta, created, ok } from '@/server/lib/api-response';
import { parseBody, parseQuery, withApi } from '@/server/middleware/api-handler';

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

/** List members (any authenticated user — transparency requirement). */
export const GET = withApi({}, async (req, ctx) => {
  const query = parseQuery(req, memberListQuerySchema);
  const { items, total } = await getMemberService().list(ctx.auth.communityId, query);
  return ok(items, buildPaginationMeta(query.page, query.limit, total));
});

/** Create a member (admins only). */
export const POST = withApi({ roles: ADMIN_ROLES }, async (req, ctx) => {
  const input = await parseBody(req, createMemberSchema);
  const member = await getMemberService().create(ctx.auth.communityId, input, ctx.auth.role);
  return created(member);
});
