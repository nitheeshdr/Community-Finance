import { reportQuerySchema } from '@community-finance/shared';
import { getReportService } from '@/server/config/container';
import { ok } from '@/server/lib/api-response';
import { parseQuery, withApi } from '@/server/middleware/api-handler';

/** Financial report for a period (all roles — transparency). */
export const GET = withApi({}, async (req, ctx) => {
  const query = parseQuery(req, reportQuerySchema);
  const report = await getReportService().generate(
    ctx.auth.communityId,
    query.period,
    query.date ?? new Date()
  );
  return ok(report);
});
