import ExcelJS from 'exceljs';
import { Types } from 'mongoose';
import {
  ExportFormat,
  ExportType,
  ReportPeriod,
  UserRole,
  toRupees,
  type AdvancedExportQuery,
} from '@community-finance/shared';
import { ExpenseModel } from '../models/expense.model';
import { IncomeModel } from '../models/income.model';
import { PaymentModel } from '../models/payment.model';
import { UserModel } from '../models/user.model';
import { CommunityModel } from '../models/community.model';
import { generateReportPdf } from '../lib/pdf';
import { reportToCsv, reportToExcel } from '../lib/export';
import type { ReportService } from './report.service';

export interface ExportFile {
  filename: string;
  mime: string;
  buffer: Buffer;
}

interface Tabular {
  title: string;
  columns: string[];
  rows: string[][];
}

const inrText = (paise: number) => `Rs ${toRupees(paise).toLocaleString('en-IN')}`;
const dateText = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(d) : '—';

/**
 * Advanced exports: any data set (summary, payments, expenses, income,
 * members), any format (PDF/Excel/CSV), custom date range + filters.
 */
export class ExportService {
  constructor(private readonly reports: ReportService) {}

  async build(communityId: string, query: AdvancedExportQuery): Promise<ExportFile> {
    const community = await CommunityModel.findById(communityId).lean();
    const communityName = community?.name ?? 'Community';
    const rangeLabel =
      query.from || query.to
        ? `${query.from ? dateText(query.from) : 'start'} – ${query.to ? dateText(query.to) : 'today'}`
        : 'All time';

    if (query.type === ExportType.SUMMARY) {
      return this.buildSummary(communityId, communityName, query);
    }

    const table = await this.buildTable(communityId, query);
    const base = `${query.type.toLowerCase()}-export`;

    if (query.format === ExportFormat.CSV) {
      const lines = [
        [`${communityName} — ${table.title}`, rangeLabel].map(csvCell).join(','),
        table.columns.map(csvCell).join(','),
        ...table.rows.map((r) => r.map(csvCell).join(',')),
      ];
      return {
        filename: `${base}.csv`,
        mime: 'text/csv; charset=utf-8',
        buffer: Buffer.from(lines.join('\r\n'), 'utf8'),
      };
    }

    if (query.format === ExportFormat.EXCEL) {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(table.title.slice(0, 30));
      ws.columns = table.columns.map(() => ({ width: 22 }));
      const title = ws.addRow([`${communityName} — ${table.title}`]);
      title.font = { bold: true, size: 14 };
      ws.addRow([rangeLabel]).font = { color: { argb: 'FF666666' } };
      ws.addRow([]);
      const header = ws.addRow(table.columns);
      header.font = { bold: true };
      header.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEDF7' } };
      });
      for (const row of table.rows) ws.addRow(row);
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      return {
        filename: `${base}.xlsx`,
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      };
    }

    const pdf = await generateReportPdf({
      communityName,
      title: table.title,
      periodLabel: rangeLabel,
      generatedAt: new Date(),
      sections: [{ heading: 'Records', rows: [['Total rows', String(table.rows.length)]] }],
      tables: [{ heading: table.title, columns: table.columns, rows: table.rows }],
    });
    return { filename: `${base}.pdf`, mime: 'application/pdf', buffer: pdf };
  }

  /* ---------------------------------------------------------------- */

  private async buildSummary(
    communityId: string,
    communityName: string,
    query: AdvancedExportQuery
  ): Promise<ExportFile> {
    const report =
      query.from || query.to
        ? await this.reports.generateRange(
            communityId,
            query.from ?? new Date(2000, 0, 1),
            query.to ?? new Date()
          )
        : await this.reports.generate(communityId, ReportPeriod.MONTHLY, new Date());

    const base = `summary-${report.period.replace(/[^\w-]+/g, '-').toLowerCase()}`;
    if (query.format === ExportFormat.CSV) {
      return {
        filename: `${base}.csv`,
        mime: 'text/csv; charset=utf-8',
        buffer: Buffer.from(reportToCsv(report, communityName), 'utf8'),
      };
    }
    if (query.format === ExportFormat.EXCEL) {
      return {
        filename: `${base}.xlsx`,
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: await reportToExcel(report, communityName),
      };
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
            ['Paid / pending / failed', `${report.collection.paidCount} / ${report.collection.pendingCount} / ${report.collection.failedCount}`],
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
          rows: report.expenses.byCategory.map((r) => [r.category, inrText(r.amount), String(r.count)]),
        },
      ],
    });
    return { filename: `${base}.pdf`, mime: 'application/pdf', buffer: pdf };
  }

  private async buildTable(communityId: string, query: AdvancedExportQuery): Promise<Tabular> {
    const cid = new Types.ObjectId(communityId);
    const dateRange = (field: string) =>
      query.from || query.to
        ? {
            [field]: {
              ...(query.from ? { $gte: query.from } : {}),
              ...(query.to ? { $lte: endOfDay(query.to) } : {}),
            },
          }
        : {};

    switch (query.type) {
      case ExportType.PAYMENTS: {
        const filter: Record<string, unknown> = {
          communityId: cid,
          ...dateRange('createdAt'),
        };
        if (query.eventId) filter.eventId = new Types.ObjectId(query.eventId);
        if (query.memberId) filter.memberId = new Types.ObjectId(query.memberId);
        if (query.status) filter.status = query.status;
        const rows = await PaymentModel.find(filter)
          .sort({ createdAt: -1 })
          .limit(5000)
          .populate('memberId', 'name')
          .populate('eventId', 'name')
          .lean();
        return {
          title: 'Payments',
          columns: ['Date', 'Member', 'Type', 'Period', 'Method', 'Status', 'Amount', 'Receipt'],
          rows: rows.map((p) => [
            dateText(p.paidAt ?? (p as { createdAt?: Date }).createdAt),
            refName(p.memberId),
            String(p.type).replace(/_/g, ' '),
            p.period ?? refName(p.eventId) ?? '—',
            String(p.method),
            String(p.status),
            inrText(p.amount),
            p.receiptNumber ?? '—',
          ]),
        };
      }

      case ExportType.EXPENSES: {
        const filter: Record<string, unknown> = {
          communityId: cid,
          deletedAt: null,
          ...dateRange('expenseDate'),
        };
        if (query.eventId) filter.eventId = new Types.ObjectId(query.eventId);
        if (query.status) filter.status = query.status;
        if (query.category) filter.category = query.category;
        const rows = await ExpenseModel.find(filter)
          .sort({ expenseDate: -1 })
          .limit(5000)
          .populate('eventId', 'name')
          .lean();
        return {
          title: 'Expenses',
          columns: ['Date', 'Expense', 'Event', 'Category', 'Vendor', 'Status', 'Amount'],
          rows: rows.map((x) => [
            dateText(x.expenseDate),
            x.name,
            refName(x.eventId),
            x.category,
            x.vendor ?? '—',
            String(x.status),
            inrText(x.amount),
          ]),
        };
      }

      case ExportType.INCOME: {
        const filter: Record<string, unknown> = {
          communityId: cid,
          deletedAt: null,
          ...dateRange('receivedAt'),
        };
        if (query.eventId) filter.eventId = new Types.ObjectId(query.eventId);
        if (query.source) filter.source = query.source;
        const rows = await IncomeModel.find(filter)
          .sort({ receivedAt: -1 })
          .limit(5000)
          .populate('eventId', 'name')
          .lean();
        return {
          title: 'Income',
          columns: ['Date', 'Source', 'From', 'Event', 'Method', 'Amount'],
          rows: rows.map((i) => [
            dateText(i.receivedAt),
            String(i.source),
            i.donorName ?? i.sponsorName ?? i.description ?? '—',
            refName(i.eventId),
            String(i.method),
            inrText(i.amount),
          ]),
        };
      }

      case ExportType.MEMBERS: {
        const filter: Record<string, unknown> = {
          communityId: cid,
          deletedAt: null,
          role: { $ne: UserRole.SUPER_ADMIN },
          ...dateRange('memberSince'),
        };
        if (query.status) filter.status = query.status;
        const rows = await UserModel.find(filter).sort({ name: 1 }).limit(5000).lean();
        return {
          title: 'Members',
          columns: ['Name', 'Phone', 'Role', 'Status', 'Member since', 'Address'],
          rows: rows.map((m) => [
            m.name,
            m.phone,
            String(m.role),
            String(m.status),
            dateText(m.memberSince),
            m.address ?? '—',
          ]),
        };
      }

      default:
        return { title: 'Export', columns: [], rows: [] };
    }
  }
}

/* ---------------------------------------------------------------- */

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function endOfDay(d: Date): Date {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

function refName(ref: unknown): string {
  if (ref && typeof ref === 'object' && 'name' in ref) return String((ref as { name: unknown }).name);
  return '—';
}
