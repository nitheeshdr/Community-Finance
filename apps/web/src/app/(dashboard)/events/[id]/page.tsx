'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  History,
  IndianRupee,
  Lock,
  Pencil,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import {
  EventStatus,
  PaymentStatus,
  UserRole,
} from '@community-finance/shared';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatDateTime, inr } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  useChangeEventStatus,
  useDeleteEvent,
  useEvent,
  useEventSplitHistory,
  useEventSplits,
} from '@/features/events/api';
import { EventFormDialog } from '@/features/events/event-form-dialog';
import { EventStatusBadge } from '@/features/events/status-badge';
import { RecordPaymentDialog } from '@/features/payments/record-payment-dialog';

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const { data: event, isLoading } = useEvent(id);
  const { data: splits } = useEventSplits(id);
  const { data: history } = useEventSplitHistory(id);
  const statusMutation = useChangeEventStatus(id);
  const deleteMutation = useDeleteEvent();

  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  if (isLoading || !event) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const remaining = event.budget - event.spentAmount;
  const isOpen = event.status === EventStatus.DRAFT || event.status === EventStatus.ACTIVE;
  const paidCount = splits?.filter((s) => s.status === PaymentStatus.PAID).length ?? 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/events">
          <ArrowLeft />
          Events
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{event.name}</h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(event.date)}
            {event.organizerName ? ` · Organized by ${event.organizerName}` : ''}
          </p>
          {event.description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{event.description}</p>
          )}
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            {isOpen && (
              <>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil />
                  Edit
                </Button>
                <Button onClick={() => setPayOpen(true)}>
                  <IndianRupee />
                  Record contribution
                </Button>
                <Button
                  variant="outline"
                  onClick={() => statusMutation.mutate({ status: EventStatus.CLOSED })}
                >
                  <Lock />
                  Close event
                </Button>
              </>
            )}
            {event.status === EventStatus.ACTIVE && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (window.confirm('Cancel this event?')) {
                    statusMutation.mutate({ status: EventStatus.CANCELLED });
                  }
                }}
              >
                <XCircle />
                Cancel
              </Button>
            )}
            {isSuperAdmin && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                loading={deleteMutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete "${event.name}" permanently?\n\nOnly possible while no expenses or collections are recorded — otherwise cancel the event instead.`
                    )
                  ) {
                    deleteMutation.mutate(event.id, {
                      onSuccess: () => router.push('/events'),
                    });
                  }
                }}
              >
                <Trash2 />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Budget" value={inr(event.budget)} />
        <StatCard label="Per member" value={inr(event.perHeadAmount)} />
        <StatCard label="Collected" value={inr(event.collectedAmount)} accent="text-success" />
        <StatCard
          label="Remaining budget"
          value={inr(remaining)}
          accent={remaining < 0 ? 'text-destructive' : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              Member contributions
            </CardTitle>
            <Badge variant="secondary">
              {paidCount}/{splits?.length ?? 0} paid
            </Badge>
          </CardHeader>
          <CardContent>
            {!splits || splits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Splits appear once the event is active and members exist.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {splits.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.memberName}</TableCell>
                      <TableCell className="text-right tabular-nums">{inr(s.splitAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{inr(s.paidAmount)}</TableCell>
                      <TableCell>
                        {s.status === PaymentStatus.PAID ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Paid
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Pending · {inr(Math.max(0, s.splitAmount - s.paidAmount))} due
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="h-4 w-4" />
              Split history
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recalculations yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l pl-4">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <p className="text-sm font-medium tabular-nums">
                      {inr(h.perHeadAmount)} × {h.activeMemberCount} members
                    </p>
                    <p className="text-xs text-muted-foreground">{h.trigger}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <EventFormDialog open={editOpen} onOpenChange={setEditOpen} event={event} />
      <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} defaultEventId={event.id} />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-lg font-semibold tabular-nums ${accent ?? ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
