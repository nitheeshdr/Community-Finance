import { z } from 'zod';
import { UserRole } from '@community-finance/shared';
import { getDocumentService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseQuery, withApi } from '@/server/middleware/api-handler';

const querySchema = z.object({
  folder: z
    .enum(['bills', 'receipts', 'invoices', 'events', 'profiles', 'documents', 'logos'])
    .default('documents'),
});

/** Signed parameters for a direct browser → Cloudinary upload. */
export const GET = withApi(
  { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  async (req, ctx) => {
    const { folder } = parseQuery(req, querySchema);
    const signature = getDocumentService().getUploadSignature(ctx.auth.communityId, folder);
    return ok(signature);
  }
);
