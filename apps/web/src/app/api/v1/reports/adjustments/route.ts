import { UserRole, createAdjustmentSchema } from '@community-finance/shared';
import { getReportService } from '@/server/config/container';
import { created } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

/** Correction entry (super admin) — never edits or deletes source records. */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, createAdjustmentSchema);
    await getReportService().createAdjustment(ctx.auth.communityId, input, ctx.auth.sub);
    return created({ recorded: true });
  }
);
