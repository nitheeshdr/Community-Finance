'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import type { DueStatus } from '@community-finance/shared';
import { formatDate, inr } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemberLedger } from './api';

const LABEL: Record<string, string> = {};
function periodLabel(period: string): string {
  if (LABEL[period]) return LABEL[period]!;
  const [y, m] = period.split('-').map(Number);
  const label =
    y && m
      ? new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(
          new Date(y, m - 1, 1)
        )
      : period;
  LABEL[period] = label;
  return label;
}

const STATUS_VARIANT: Record<DueStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PAID: 'success',
  PENDING: 'warning',
  OVERDUE: 'destructive',
  UNPAID: 'secondary',
};

/** Month-by-month subscription ledger for one member. */
export function MemberLedger({ memberId }: { memberId: string }) {
  const { data: ledger, isLoading } = useMemberLedger(memberId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  if (!ledger || ledger.entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No subscription history yet.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        <span className="inline-flex items-center gap-1.5 text-success">
          <CheckCircle2 className="h-4 w-4" />
          {ledger.paidMonths} paid
        </span>
        <span className="inline-flex items-center gap-1.5 text-destructive">
          <XCircle className="h-4 w-4" />
          {ledger.unpaidMonths} unpaid
        </span>
        <span className="text-muted-foreground">Total paid {inr(ledger.totalPaid)}</span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {ledger.entries.map((e) => (
          <div
            key={e.period}
            className="flex items-center justify-between rounded-md border px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{periodLabel(e.period)}</p>
              {e.status === 'PAID' && e.paidAt && (
                <p className="text-xs text-muted-foreground">
                  {formatDate(e.paidAt)} · {e.method?.toLowerCase()}
                  {e.receiptNumber ? ` · ${e.receiptNumber}` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm tabular-nums text-muted-foreground">{inr(e.amount)}</span>
              <Badge variant={STATUS_VARIANT[e.status]} className="capitalize">
                {e.status.toLowerCase()}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
