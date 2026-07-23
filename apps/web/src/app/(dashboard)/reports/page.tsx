'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  SlidersHorizontal,
} from 'lucide-react';
import {
  API_PREFIX,
  ExportFormat,
  ReportPeriod,
  UserRole,
  type ApiSuccess,
  type FinancialReportDto,
} from '@community-finance/shared';
import { apiClient, apiErrorMessage, getAccessToken } from '@/lib/api-client';
import { AdvancedExportDialog } from '@/features/reports/advanced-export-dialog';
import { useAuth } from '@/lib/auth-context';
import { formatDate, inr } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  [ReportPeriod.DAILY]: 'Daily',
  [ReportPeriod.WEEKLY]: 'Weekly',
  [ReportPeriod.MONTHLY]: 'Monthly',
  [ReportPeriod.QUARTERLY]: 'Quarterly',
  [ReportPeriod.YEARLY]: 'Yearly',
};

export default function ReportsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const qc = useQueryClient();

  const [period, setPeriod] = useState<ReportPeriod>(ReportPeriod.MONTHLY);
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', period, anchorDate],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<FinancialReportDto>>('/reports', {
        params: { period, date: anchorDate },
      });
      return res.data.data;
    },
  });

  const { data: snapshots } = useQuery({
    queryKey: ['reports', 'snapshots'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<Array<{ period: string; closedAt: string }>>>(
        '/reports/snapshots'
      );
      return res.data.data;
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (p: string) => {
      await apiClient.post('/reports/snapshots', { period: p });
    },
    onSuccess: () => {
      toast.success('Period closed — snapshot frozen');
      void qc.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  async function exportReport(format: ExportFormat) {
    // Authenticated file download via fetch → blob.
    const params = new URLSearchParams({ period, date: anchorDate, format });
    const res = await fetch(`${API_PREFIX}/reports/export?${params}`, {
      headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
    });
    if (!res.ok) {
      toast.error('Export failed');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const ext = format === ExportFormat.PDF ? 'pdf' : format === ExportFormat.EXCEL ? 'xlsx' : 'csv';
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${report?.period ?? period}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const prevMonthPeriod = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const prevMonthClosed = snapshots?.some((s) => s.period === prevMonthPeriod) ?? false;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Transparent financial reporting for every member"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void exportReport(ExportFormat.PDF)}>
              <FileText />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportReport(ExportFormat.EXCEL)}>
              <FileSpreadsheet />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportReport(ExportFormat.CSV)}>
              <Download />
              CSV
            </Button>
            <Button size="sm" onClick={() => setAdvancedOpen(true)}>
              <SlidersHorizontal />
              Advanced export
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PERIOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-40"
          value={anchorDate}
          onChange={(e) => setAnchorDate(e.target.value)}
        />
        {report?.snapshot && (
          <Badge variant="outline">
            <Lock className="mr-1 h-3 w-3" />
            Closed period (immutable)
          </Badge>
        )}
        {isSuperAdmin && !prevMonthClosed && (
          <Button
            variant="secondary"
            size="sm"
            loading={closeMutation.isPending}
            onClick={() => {
              if (window.confirm(`Close period ${prevMonthPeriod}? This freezes the figures permanently.`)) {
                closeMutation.mutate(prevMonthPeriod);
              }
            }}
          >
            <Lock />
            Close {prevMonthPeriod}
          </Button>
        )}
      </div>

      {isLoading || !report ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Opening balance" value={inr(report.openingBalance)} />
            <SummaryCard label="Income" value={inr(report.income.total)} accent="text-success" />
            <SummaryCard label="Expenses" value={inr(report.expenses.total)} accent="text-destructive" />
            <SummaryCard label="Closing balance" value={inr(report.closingBalance)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Collection — {report.period}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Expected" value={inr(report.collection.expected)} />
                <Row label="Collected" value={inr(report.collection.collected)} />
                <Row label="Pending" value={inr(report.collection.pending)} />
                <Row label="Paid members" value={String(report.collection.paidCount)} />
                <Row label="Pending members" value={String(report.collection.pendingCount)} />
                <Row label="Failed payments" value={String(report.collection.failedCount)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Community stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Total members" value={String(report.memberStats.total)} />
                <Row label="Active" value={String(report.memberStats.active)} />
                <Row label="Suspended" value={String(report.memberStats.suspended)} />
                <Row label="Events (open)" value={String(report.eventStats.active)} />
                <Row label="Events (closed)" value={String(report.eventStats.closed)} />
                <Row
                  label="Donations"
                  value={`${inr(report.donations.total)} (${report.donations.count})`}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable title="Income by source" rows={report.income.bySource} />
            <BreakdownTable title="Expenses by category" rows={report.expenses.byCategory} />
          </div>

          {snapshots && snapshots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4" />
                  Closed periods (immutable snapshots)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {snapshots.map((s) => (
                    <button
                      key={s.period}
                      type="button"
                      className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                      title={`Closed ${formatDate(s.closedAt)}`}
                      onClick={() => {
                        setPeriod(ReportPeriod.MONTHLY);
                        setAnchorDate(`${s.period}-15`);
                      }}
                    >
                      <Lock className="mr-1 inline h-3 w-3" />
                      {s.period}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AdvancedExportDialog open={advancedOpen} onOpenChange={setAdvancedOpen} />
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-semibold tabular-nums ${accent ?? ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ category: string; amount: number; count: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No records in this period.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.category}>
                  <TableCell className="capitalize">{r.category.toLowerCase().replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{inr(r.amount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
