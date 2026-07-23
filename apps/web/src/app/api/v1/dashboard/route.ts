import { getCronService, getDashboardService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { withApi } from '@/server/middleware/api-handler';

/** Dashboard analytics (all roles — transparency). */
export const GET = withApi({}, async (_req, ctx) => {
  // Free-plan-friendly scheduler: if today's housekeeping (reminders,
  // overdue marking, monthly close) hasn't run, trigger it in the
  // background — no Vercel Cron required.
  getCronService().maybeRunHousekeeping();

  const stats = await getDashboardService().getStats(ctx.auth.communityId);
  return ok(stats);
});
