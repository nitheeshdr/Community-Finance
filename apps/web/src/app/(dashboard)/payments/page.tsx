'use client';

import { useState } from 'react';
import {
  Check,
  CreditCard,
  Download,
  MoreHorizontal,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  UserRole,
  type PaymentDto,
} from '@community-finance/shared';
import { useAuth } from '@/lib/auth-context';
import { formatDate, inr } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { usePayments, useRefundPayment, useReviewPayment } from '@/features/payments/api';
import { RecordPaymentDialog } from '@/features/payments/record-payment-dialog';
import { PaymentStatusBadge } from '@/features/payments/status-badge';

export default function PaymentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [method, setMethod] = useState<PaymentMethod | 'ALL'>('ALL');
  const [type, setType] = useState<PaymentType | 'ALL'>('ALL');
  const [recordOpen, setRecordOpen] = useState(false);

  const { data, isLoading } = usePayments({ page, status, method, type });
  const payments = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Subscriptions, contributions, and manual entries"
        actions={
          isAdmin && (
            <Button onClick={() => setRecordOpen(true)}>
              <Plus />
              Record payment
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(v) => { setStatus(v as PaymentStatus | 'ALL'); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {Object.values(PaymentStatus).map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={method} onValueChange={(v) => { setMethod(v as PaymentMethod | 'ALL'); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All methods</SelectItem>
                <SelectItem value={PaymentMethod.RAZORPAY}>Razorpay</SelectItem>
                <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                <SelectItem value={PaymentMethod.UPI}>UPI</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => { setType(v as PaymentType | 'ALL'); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value={PaymentType.SUBSCRIPTION}>Subscription</SelectItem>
                <SelectItem value={PaymentType.EVENT_CONTRIBUTION}>Event contribution</SelectItem>
                <SelectItem value={PaymentType.DONATION}>Donation</SelectItem>
                <SelectItem value={PaymentType.SPONSORSHIP}>Sponsorship</SelectItem>
                <SelectItem value={PaymentType.MISC}>Miscellaneous</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payments found"
              description="Recorded and gateway payments will appear here."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Date</TableHead>
                    {isAdmin && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <PaymentRow key={p.id} payment={p} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
                  ))}
                </TableBody>
              </Table>
              {meta && <PaginationControls meta={meta} onPageChange={setPage} />}
            </>
          )}
        </CardContent>
      </Card>

      <RecordPaymentDialog open={recordOpen} onOpenChange={setRecordOpen} />
    </div>
  );
}

function PaymentRow({
  payment,
  isAdmin,
  isSuperAdmin,
}: {
  payment: PaymentDto;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}) {
  const reviewMutation = useReviewPayment();
  const refundMutation = useRefundPayment();
  const canReview = isAdmin && payment.status === PaymentStatus.PENDING && payment.method !== PaymentMethod.RAZORPAY;
  const canRefund = isSuperAdmin && payment.status === PaymentStatus.PAID;

  return (
    <TableRow>
      <TableCell className="font-medium">{payment.memberName ?? '—'}</TableCell>
      <TableCell className="capitalize text-muted-foreground">
        {payment.type.replace(/_/g, ' ').toLowerCase()}
        {payment.period ? ` · ${payment.period}` : ''}
      </TableCell>
      <TableCell className="capitalize text-muted-foreground">
        {payment.method.toLowerCase()}
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">{inr(payment.amount)}</TableCell>
      <TableCell>
        <PaymentStatusBadge status={payment.status} />
      </TableCell>
      <TableCell>
        {payment.receiptUrl ? (
          <a
            href={payment.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Download className="h-3 w-3" />
            {payment.receiptNumber}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">{payment.receiptNumber ?? '—'}</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(payment.paidAt ?? payment.createdAt)}
      </TableCell>
      {isAdmin && (
        <TableCell>
          {(canReview || canRefund) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Payment actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canReview && (
                  <>
                    <DropdownMenuItem
                      onClick={() => reviewMutation.mutate({ id: payment.id, action: 'APPROVE' })}
                    >
                      <Check />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        const reason = window.prompt('Reason for rejection (optional)') ?? undefined;
                        reviewMutation.mutate({ id: payment.id, action: 'REJECT', reason });
                      }}
                    >
                      <X />
                      Reject
                    </DropdownMenuItem>
                  </>
                )}
                {canRefund && (
                  <DropdownMenuItem
                    onClick={() => {
                      const reason = window.prompt('Reason for refund');
                      if (reason && reason.trim().length >= 3) {
                        refundMutation.mutate({ id: payment.id, reason: reason.trim() });
                      }
                    }}
                  >
                    <RotateCcw />
                    Refund
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
