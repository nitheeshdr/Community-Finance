import { UserRole, closePeriodSchema } from '@community-finance/shared';
import { getReportService } from '@/server/config/container';
import { created, ok } from '@/server/lib/api-response';
import { parseBody, withApi } from '@/server/middleware/api-handler';

/** List closed monthly snapshots. */
export const GET = withApi({}, async (_req, ctx) => {
  const snapshots = await getReportService().listSnapshots(ctx.auth.communityId);
  return ok(snapshots);
});

/** Close a month (super admin) — freezes an immutable snapshot. */
export const POST = withApi(
  { roles: [UserRole.SUPER_ADMIN] },
  async (req, ctx) => {
    const input = await parseBody(req, closePeriodSchema);
    await getReportService().closePeriod(ctx.auth.communityId, input.period, ctx.auth.sub);
    return created({ period: input.period, closed: true });
  }
);
