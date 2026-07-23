import {
  UserRole,
  documentListQuerySchema,
  registerDocumentSchema,
} from '@community-finance/shared';
import { getDocumentService } from '@/server/config/container';
import { buildPaginationMeta, created, ok } from '@/server/lib/api-response';
import { parseBody, parseQuery, withApi } from '@/server/middleware/api-handler';

/** List documents (all roles — bills/receipts are transparent). */
export const GET = withApi({}, async (req, ctx) => {
  const query = parseQuery(req, documentListQuerySchema);
  const { items, total } = await getDocumentService().list(ctx.auth.communityId, query);
  return ok(items, buildPaginationMeta(query.page, query.limit, total));
});

/** Register an uploaded document's metadata. */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, registerDocumentSchema);
    const doc = await getDocumentService().register(ctx.auth.communityId, input, ctx.auth.sub);
    return created(doc);
  }
);
