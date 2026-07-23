'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import {
  AuditAction,
  AuditEntity,
  type ApiSuccess,
  type AuditLogDto,
} from '@community-finance/shared';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditAction | 'ALL'>('ALL');
  const [entity, setEntity] = useState<AuditEntity | 'ALL'>('ALL');
  const [selected, setSelected] = useState<AuditLogDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { page, action, entity }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<AuditLogDto[]>>('/audit-logs', {
        params: {
          page,
          limit: 25,
          ...(action !== 'ALL' ? { action } : {}),
          ...(entity !== 'ALL' ? { entity } : {}),
        },
      });
      return res.data;
    },
  });
  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader
        title="Audit logs"
        description="Immutable record of every important action — cannot be edited or deleted"
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <Select
              value={action}
              onValueChange={(v) => {
                setAction(v as AuditAction | 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All actions</SelectItem>
                {Object.values(AuditAction).map((a) => (
                  <SelectItem key={a} value={a} className="capitalize">
                    {a.replace(/_/g, ' ').toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={entity}
              onValueChange={(v) => {
                setEntity(v as AuditEntity | 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All entities</SelectItem>
                {Object.values(AuditEntity).map((e) => (
                  <SelectItem key={e} value={e} className="capitalize">
                    {e.replace(/_/g, ' ').toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No audit entries"
              description="Actions like logins, edits, and approvals are recorded here automatically."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(log)}
                    >
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{log.userName}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {log.role.replace('_', ' ').toLowerCase()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {log.action.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {log.entity.replace(/_/g, ' ').toLowerCase()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[log.browser, log.os].filter(Boolean).join(' · ') || '—'}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">
                        {log.ip ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {meta && <PaginationControls meta={meta} onPageChange={setPage} />}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.action.replace(/_/g, ' ').toLowerCase()} ·{' '}
              {selected?.entity.replace(/_/g, ' ').toLowerCase()}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>By {selected.userName}</span>
                <span>{formatDateTime(selected.createdAt)}</span>
                <span>{[selected.device, selected.browser, selected.os].filter(Boolean).join(' · ')}</span>
                <span>IP {selected.ip ?? '—'}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DiffPane title="Before" value={selected.before} />
                <DiffPane title="After" value={selected.after} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiffPane({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
        {value ? JSON.stringify(value, null, 2) : '—'}
      </pre>
    </div>
  );
}
