import { NextResponse } from 'next/server';
import {
  AuditAction,
  AuditEntity,
  ExportFormat,
  reportExportQuerySchema,
  toRupees,
} from '@community-finance/shared';
import { getAuditService, getReportService } from '@/server/config/container';
import { generateReportPdf } from '@/server/lib/pdf';
import { reportToCsv, reportToExcel } from '@/server/lib/export';
import { CommunityModel } from '@/server/models/community.model';
import { parseQuery, withApi } from '@/server/middleware/api-handler';

const inrText = (paise: number) => `Rs ${toRupees(paise).toLocaleString('en-IN')}`;

/** Export a report as PDF, Excel, or CSV (streamed download). */
export const GET = withApi({}, async (req, ctx) => {
  const query = parseQuery(req, reportExportQuerySchema);
  const report = await getReportService().generate(
    ctx.auth.communityId,
    query.period,
    query.date ?? new Date()
  );
  const community = await CommunityModel.findById(ctx.auth.communityId).lean();
  const communityName = community?.name ?? 'Community';
  const filenameBase = `report-${report.period.replace(/\s+/g, '-').toLowerCase()}`;

  await getAuditService().record({
    action: AuditAction.REPORT_EXPORTED,
    entity: AuditEntity.REPORT,
    after: { period: report.period, format: query.format },
  });

  if (query.format === ExportFormat.CSV) {
    return new NextResponse(reportToCsv(report, communityName), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  if (query.format === ExportFormat.EXCEL) {
    const buffer = await reportToExcel(report, communityName);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }

  const pdf = await generateReportPdf({
    communityName,
    title: 'Financial Report',
    periodLabel: report.period,
    generatedAt: new Date(report.generatedAt),
    sections: [
      {
        heading: 'Summary',
        rows: [
          ['Opening balance', inrText(report.openingBalance)],
          ['Total income', inrText(report.income.total)],
          ['Total expenses', inrText(report.expenses.total)],
          ['Closing balance', inrText(report.closingBalance)],
        ],
      },
      {
        heading: 'Collection',
        rows: [
          ['Expected', inrText(report.collection.expected)],
          ['Collected', inrText(report.collection.collected)],
          ['Pending', inrText(report.collection.pending)],
          ['Paid members', String(report.collection.paidCount)],
          ['Pending members', String(report.collection.pendingCount)],
          ['Failed payments', String(report.collection.failedCount)],
        ],
      },
      {
        heading: 'Members',
        rows: [
          ['Total', String(report.memberStats.total)],
          ['Active', String(report.memberStats.active)],
          ['Inactive', String(report.memberStats.inactive)],
          ['Suspended', String(report.memberStats.suspended)],
        ],
      },
      {
        heading: 'Donations',
        rows: [
          ['Total', inrText(report.donations.total)],
          ['Count', String(report.donations.count)],
        ],
      },
    ],
    tables: [
      {
        heading: 'Income by source',
        columns: ['Source', 'Amount', 'Count'],
        rows: report.income.bySource.map((r) => [r.category, inrText(r.amount), String(r.count)]),
      },
      {
        heading: 'Expenses by category',
        columns: ['Category', 'Amount', 'Count'],
        rows: report.expenses.byCategory.map((r) => [
          r.category,
          inrText(r.amount),
          String(r.count),
        ]),
      },
    ],
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
    },
  });
});
