import ExcelJS from 'exceljs';
import { toRupees, type FinancialReportDto } from '@community-finance/shared';

/** Escape a CSV cell per RFC 4180. */
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function reportToCsv(report: FinancialReportDto, communityName: string): string {
  const lines: string[] = [];
  const push = (...cells: Array<string | number>) => lines.push(cells.map(csvCell).join(','));

  push(`${communityName} — Financial Report`, report.period);
  push('');
  push('Summary');
  push('Opening balance (₹)', toRupees(report.openingBalance));
  push('Total income (₹)', toRupees(report.income.total));
  push('Total expenses (₹)', toRupees(report.expenses.total));
  push('Closing balance (₹)', toRupees(report.closingBalance));
  push('');
  push('Collection');
  push('Expected (₹)', toRupees(report.collection.expected));
  push('Collected (₹)', toRupees(report.collection.collected));
  push('Pending (₹)', toRupees(report.collection.pending));
  push('Paid members', report.collection.paidCount);
  push('Pending members', report.collection.pendingCount);
  push('Failed payments', report.collection.failedCount);
  push('');
  push('Income by source');
  push('Source', 'Amount (₹)', 'Count');
  for (const row of report.income.bySource) {
    push(row.category, toRupees(row.amount), row.count);
  }
  push('');
  push('Expenses by category');
  push('Category', 'Amount (₹)', 'Count');
  for (const row of report.expenses.byCategory) {
    push(row.category, toRupees(row.amount), row.count);
  }
  push('');
  push('Members');
  push('Total', report.memberStats.total);
  push('Active', report.memberStats.active);
  push('Inactive', report.memberStats.inactive);
  push('Suspended', report.memberStats.suspended);
  push('');
  push('Donations');
  push('Total (₹)', toRupees(report.donations.total));
  push('Count', report.donations.count);

  return lines.join('\r\n');
}

export async function reportToExcel(
  report: FinancialReportDto,
  communityName: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Community Finance';
  const ws = wb.addWorksheet('Report');

  ws.columns = [{ width: 32 }, { width: 18 }, { width: 12 }];

  const title = ws.addRow([`${communityName} — Financial Report`]);
  title.font = { bold: true, size: 14 };
  ws.addRow([`Period: ${report.period}`]).font = { color: { argb: 'FF666666' } };
  ws.addRow([]);

  const addSection = (heading: string, rows: Array<[string, string | number]>) => {
    const h = ws.addRow([heading]);
    h.font = { bold: true, size: 12 };
    for (const [label, value] of rows) {
      const r = ws.addRow([label, value]);
      r.getCell(2).numFmt = typeof value === 'number' ? '#,##0.00' : undefined!;
    }
    ws.addRow([]);
  };

  addSection('Summary', [
    ['Opening balance (₹)', toRupees(report.openingBalance)],
    ['Total income (₹)', toRupees(report.income.total)],
    ['Total expenses (₹)', toRupees(report.expenses.total)],
    ['Closing balance (₹)', toRupees(report.closingBalance)],
  ]);
  addSection('Collection', [
    ['Expected (₹)', toRupees(report.collection.expected)],
    ['Collected (₹)', toRupees(report.collection.collected)],
    ['Pending (₹)', toRupees(report.collection.pending)],
    ['Paid members', report.collection.paidCount],
    ['Pending members', report.collection.pendingCount],
    ['Failed payments', report.collection.failedCount],
  ]);

  const addTable = (heading: string, rows: Array<{ category: string; amount: number; count: number }>) => {
    const h = ws.addRow([heading]);
    h.font = { bold: true, size: 12 };
    const header = ws.addRow(['Category', 'Amount (₹)', 'Count']);
    header.font = { bold: true };
    for (const row of rows) {
      const r = ws.addRow([row.category, toRupees(row.amount), row.count]);
      r.getCell(2).numFmt = '#,##0.00';
    }
    ws.addRow([]);
  };
  addTable('Income by source', report.income.bySource);
  addTable('Expenses by category', report.expenses.byCategory);

  addSection('Members', [
    ['Total', report.memberStats.total],
    ['Active', report.memberStats.active],
    ['Inactive', report.memberStats.inactive],
    ['Suspended', report.memberStats.suspended],
  ]);
  addSection('Donations', [
    ['Total (₹)', toRupees(report.donations.total)],
    ['Count', report.donations.count],
  ]);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
