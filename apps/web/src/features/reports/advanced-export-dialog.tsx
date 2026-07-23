'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import {
  API_PREFIX,
  ExpenseStatus,
  ExportFormat,
  ExportType,
  IncomeSource,
  PaymentStatus,
  UserStatus,
  type ApiSuccess,
  type EventDto,
  type MemberDto,
} from '@community-finance/shared';
import { apiClient, getAccessToken } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TYPE_LABELS: Record<ExportType, string> = {
  [ExportType.SUMMARY]: 'Financial summary',
  [ExportType.PAYMENTS]: 'Payments list',
  [ExportType.EXPENSES]: 'Expenses list',
  [ExportType.INCOME]: 'Income list',
  [ExportType.MEMBERS]: 'Members list',
};

export function AdvancedExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [type, setType] = useState<ExportType>(ExportType.SUMMARY);
  const [format, setFormat] = useState<ExportFormat>(ExportFormat.EXCEL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [eventId, setEventId] = useState('ALL');
  const [memberId, setMemberId] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [downloading, setDownloading] = useState(false);

  const { data: events } = useQuery({
    queryKey: ['events', 'picker'],
    enabled: open,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<EventDto[]>>('/events', {
        params: { page: 1, limit: 100 },
      });
      return res.data.data;
    },
  });
  const { data: members } = useQuery({
    queryKey: ['members', 'picker-all'],
    enabled: open && type === ExportType.PAYMENTS,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<MemberDto[]>>('/members', {
        params: { page: 1, limit: 100 },
      });
      return res.data.data;
    },
  });

  const showEvent =
    type === ExportType.PAYMENTS || type === ExportType.EXPENSES || type === ExportType.INCOME;
  const showMember = type === ExportType.PAYMENTS;
  const showStatus =
    type === ExportType.PAYMENTS || type === ExportType.EXPENSES || type === ExportType.MEMBERS;
  const showSource = type === ExportType.INCOME;

  const statusOptions =
    type === ExportType.PAYMENTS
      ? Object.values(PaymentStatus)
      : type === ExportType.EXPENSES
        ? Object.values(ExpenseStatus)
        : Object.values(UserStatus);

  async function download() {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ type, format });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (showEvent && eventId !== 'ALL') params.set('eventId', eventId);
      if (showMember && memberId !== 'ALL') params.set('memberId', memberId);
      if (showStatus && status !== 'ALL') params.set('status', status);
      if (showSource && source !== 'ALL') params.set('source', source);

      const res = await fetch(`${API_PREFIX}/reports/export/advanced?${params}`, {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
      });
      if (!res.ok) {
        toast.error('Export failed — check the filters and try again');
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `export.${format.toLowerCase()}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
      onOpenChange(false);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Advanced export</DialogTitle>
          <DialogDescription>
            Choose a data set, date range, and filters — export as PDF, Excel, or CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Data</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as ExportType);
                  setStatus('ALL');
                  setSource('ALL');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ExportFormat.EXCEL}>Excel (.xlsx)</SelectItem>
                  <SelectItem value={ExportFormat.CSV}>CSV</SelectItem>
                  <SelectItem value={ExportFormat.PDF}>PDF (print-ready)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="exp-from">From date</Label>
              <Input id="exp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-to">To date</Label>
              <Input id="exp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {(showEvent || showMember || showStatus || showSource) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {showEvent && (
                <div className="space-y-2">
                  <Label>Event</Label>
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All events</SelectItem>
                      {(events ?? []).map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {showMember && (
                <div className="space-y-2">
                  <Label>Member</Label>
                  <Select value={memberId} onValueChange={setMemberId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All members</SelectItem>
                      {(members ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {showStatus && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {showSource && (
                <div className="space-y-2">
                  <Label>Income source</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All sources</SelectItem>
                      {Object.values(IncomeSource).map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void download()} loading={downloading}>
            <Download />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
