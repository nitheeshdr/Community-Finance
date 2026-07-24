'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Phone, ShieldCheck, Users } from 'lucide-react';
import { useMember } from '@/features/members/api';
import { MemberStatusBadge } from '@/features/members/status-badge';
import { usePayments } from '@/features/payments/api';
import { PaymentStatusBadge } from '@/features/payments/status-badge';
import { MemberLedger } from '@/features/dues/member-ledger';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { formatDate, initials, inr } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: member, isLoading } = useMember(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!member) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Member not found.
        <div className="mt-4">
          <Button variant="outline" asChild>
            <Link href="/members">
              <ArrowLeft />
              Back to members
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/members">
          <ArrowLeft />
          Members
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="h-16 w-16 text-lg">
          {member.profileImage && <AvatarImage src={member.profileImage} alt="" />}
          <AvatarFallback>{initials(member.name)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{member.name}</h1>
            <MemberStatusBadge status={member.status} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Member since {formatDate(member.memberSince)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="tabular-nums">{member.phone}</span>
            </div>
            {member.address && (
              <div className="flex items-start gap-2.5">
                <Home className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{member.address}</span>
              </div>
            )}
            {member.aadhaarMasked && (
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="tabular-nums">{member.aadhaarMasked}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Family</CardTitle>
          </CardHeader>
          <CardContent>
            {member.familyGroup && (
              <div className="mb-3 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{member.familyGroup}</span>
                <span className="text-xs text-muted-foreground">household</span>
              </div>
            )}
            {member.family.length === 0 ? (
              <p className="text-sm text-muted-foreground">No family members recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {member.family.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {f.name}
                      <span className="text-muted-foreground">
                        {' '}
                        · {f.relation}
                        {f.age != null ? `, ${f.age}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Membership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Role" value={member.role.replace('_', ' ').toLowerCase()} />
            <InfoRow label="Status" value={member.status.toLowerCase()} />
            <InfoRow label="Joined" value={formatDate(member.memberSince)} />
            <InfoRow label="Added on" value={formatDate(member.createdAt)} />
          </CardContent>
        </Card>
      </div>

      {/* Monthly subscription ledger — paid/unpaid per month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Subscription ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberLedger memberId={member.id} />
        </CardContent>
      </Card>

      {/* All payment records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberPayments memberId={member.id} />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function MemberPayments({ memberId }: { memberId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePayments({ page, memberId });
  const payments = data?.data ?? [];
  const meta = data?.meta;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">No payments recorded yet.</p>;
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Receipt</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="capitalize">
                {p.type.replace(/_/g, ' ').toLowerCase()}
                {p.period ? ` · ${p.period}` : ''}
                {p.eventName ? ` · ${p.eventName}` : ''}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{inr(p.amount)}</TableCell>
              <TableCell>
                <PaymentStatusBadge status={p.status} />
              </TableCell>
              <TableCell>
                {p.receiptUrl ? (
                  <a
                    href={p.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {p.receiptNumber}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">{p.receiptNumber ?? '—'}</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(p.paidAt ?? p.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {meta && <PaginationControls meta={meta} onPageChange={setPage} />}
    </div>
  );
}
