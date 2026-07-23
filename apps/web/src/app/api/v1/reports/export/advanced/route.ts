import { NextResponse } from 'next/server';
import {
  AuditAction,
  AuditEntity,
  advancedExportQuerySchema,
} from '@community-finance/shared';
import { getAuditService, getExportService } from '@/server/config/container';
import { parseQuery, withApi } from '@/server/middleware/api-handler';

/**
 * Advanced export: any data set (summary/payments/expenses/income/members),
 * any format (PDF/Excel/CSV), custom date range and filters.
 */
export const GET = withApi({}, async (req, ctx) => {
  const query = parseQuery(req, advancedExportQuerySchema);
  const file = await getExportService().build(ctx.auth.communityId, query);

  await getAuditService().record({
    action: AuditAction.REPORT_EXPORTED,
    entity: AuditEntity.REPORT,
    after: { type: query.type, format: query.format, from: query.from, to: query.to },
  });

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      'Content-Type': file.mime,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    },
  });
});
