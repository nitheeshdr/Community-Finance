import { UserRole } from '@community-finance/shared';
import { getDocumentService } from '@/server/config/container';
import { noContent } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

export const DELETE = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (_req, ctx) => {
    await getDocumentService().remove(ctx.auth.communityId, ctx.params.id!);
    return noContent();
  }
);
