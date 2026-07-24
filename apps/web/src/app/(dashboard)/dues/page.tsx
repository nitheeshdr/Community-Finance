'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, Search } from 'lucide-react';
import type { DueStatus, MemberDueDto } from '@community-finance/shared';
import { inr } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDues } from '@/features/dues/api';

const STATUS_VARIANT: Record<DueStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PAID: 'success',
  PENDING: 'warning',
  OVERDUE: 'destructive',
  UNPAID: 'secondary',
};

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function DuesPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [search, setSearch] = useState('');
  const [onlyUnpaid, setOnlyUnpaid] = useState(true);

  const { data, isLoading } = useDues(period);

  const members = (data?.members ?? []).filter((m) => {
    if (onlyUnpaid && m.status === 'PAID') return false;
    if (search) {
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.phone.includes(search);
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Monthly dues"
        description="Who has paid their subscription — and who hasn't"
      />

      {/* Summary */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Collected" value={`${data?.paid ?? 0}/${data?.total ?? 0}`} sub="members paid" tone="success" />
        <SummaryTile label="Unpaid" value={String(data?.unpaid ?? 0)} sub="members pending" tone="destructive" />
        <SummaryTile label="Monthly fee" value={inr(data?.fee ?? 0)} sub="per active member" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="month"
                className="w-40"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={onlyUnpaid}
                onChange={(e) => setOnlyUnpaid(e.target.checked)}
              />
              Unpaid only
            </label>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={onlyUnpaid ? 'Everyone has paid' : 'No members'}
              description={
                onlyUnpaid
                  ? `All active members have paid for ${period}.`
                  : 'No active members match your search.'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <DueRow key={m.memberId} member={m} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DueRow({ member }: { member: MemberDueDto }) {
  return (
    <TableRow>
      <TableCell>
        <Link href={`/members/${member.memberId}`} className="font-medium hover:underline">
          {member.name}
        </Link>
      </TableCell>
      <TableCell className="tabular-nums text-muted-foreground">{member.phone}</TableCell>
      <TableCell className="text-right font-medium tabular-nums">{inr(member.amount)}</TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[member.status]} className="capitalize">
          {member.status.toLowerCase()}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

function SummaryTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'success' | 'destructive';
}) {
  const color =
    tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : '';
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
