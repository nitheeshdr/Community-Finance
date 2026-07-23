'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Plus } from 'lucide-react';
import {
  EventStatus,
  UserRole,
  type EventDto,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvents } from '@/features/events/api';
import { EventFormDialog } from '@/features/events/event-form-dialog';
import { EventStatusBadge } from '@/features/events/status-badge';

export default function EventsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<EventStatus | 'ALL'>('ALL');
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useEvents({ page, status });
  const events = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader
        title="Events"
        description="Festivals, meetings, and collections with transparent budgets"
        actions={
          isAdmin && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus />
              Create event
            </Button>
          )
        }
      />

      <div className="mb-4">
        <Select value={status} onValueChange={(v) => { setStatus(v as EventStatus | 'ALL'); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {Object.values(EventStatus).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events yet"
          description="Create your first event — the budget splits across active members automatically."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {meta && <PaginationControls meta={meta} onPageChange={setPage} />}
        </>
      )}

      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function EventCard({ event }: { event: EventDto }) {
  const progress =
    event.budget > 0 ? Math.min(100, Math.round((event.collectedAmount / event.budget) * 100)) : 0;

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold leading-tight">{event.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(event.date)}</p>
            </div>
            <EventStatusBadge status={event.status} />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium tabular-nums">{inr(event.budget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Per member</span>
              <span className="font-medium tabular-nums">{inr(event.perHeadAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Collected</span>
              <span className="font-medium tabular-nums text-success">
                {inr(event.collectedAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spent</span>
              <span className="font-medium tabular-nums">{inr(event.spentAmount)}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Collection progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
