'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { ApiSuccess } from '@community-finance/shared';
import { apiClient, apiErrorMessage } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

type Section =
  | 'PAYMENTS'
  | 'EXPENSES'
  | 'INCOME'
  | 'EVENTS'
  | 'DOCUMENTS'
  | 'NOTIFICATIONS'
  | 'SUBSCRIPTIONS'
  | 'MEMBERS'
  | 'ALL';

const SECTIONS: { section: Section; label: string; description: string }[] = [
  { section: 'PAYMENTS', label: 'Payments', description: 'All payment records and receipts' },
  { section: 'EXPENSES', label: 'Expenses', description: 'All expense records' },
  { section: 'INCOME', label: 'Income', description: 'All income and donation records' },
  { section: 'EVENTS', label: 'Events', description: 'All events, splits, and split history' },
  { section: 'DOCUMENTS', label: 'Documents', description: 'All document metadata' },
  { section: 'NOTIFICATIONS', label: 'Notifications', description: 'All notifications' },
  { section: 'SUBSCRIPTIONS', label: 'Subscriptions', description: 'All AutoPay subscriptions' },
  {
    section: 'MEMBERS',
    label: 'Members',
    description: 'All members and admins (keeps you) + their payments and splits',
  },
];

interface ClearResult {
  section: string;
  deleted: number;
  counts: Record<string, number>;
}

export function DangerZone() {
  const qc = useQueryClient();
  const [target, setTarget] = useState<{ section: Section; label: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const clearMutation = useMutation({
    mutationFn: async (section: Section) => {
      const res = await apiClient.post<ApiSuccess<ClearResult>>('/admin/clear-data', {
        section,
        confirm: 'CLEAR',
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Cleared ${data.deleted} record(s) from ${data.section.toLowerCase()}`);
      void qc.invalidateQueries();
      setTarget(null);
      setConfirmText('');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <Card className="max-w-2xl border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Danger zone
        </CardTitle>
        <CardDescription>
          Permanently delete data for this community. This cannot be undone. Audit logs and
          closed-period report snapshots are never deleted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {SECTIONS.map((s) => (
          <div
            key={s.section}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <div>
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setTarget({ section: s.section, label: s.label });
                setConfirmText('');
              }}
            >
              <Trash2 />
              Clear
            </Button>
          </div>
        ))}

        <div className="flex items-center justify-between gap-3 rounded-md border border-destructive bg-destructive/5 p-3">
          <div>
            <p className="text-sm font-semibold text-destructive">Clear everything</p>
            <p className="text-xs text-muted-foreground">
              All transactional data (payments, expenses, income, events, documents,
              notifications, subscriptions, adjustments). Keeps members, settings, and the
              community.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setTarget({ section: 'ALL', label: 'ALL transactional data' });
              setConfirmText('');
            }}
          >
            <Trash2 />
            Clear all
          </Button>
        </div>
      </CardContent>

      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Clear {target?.label}?
            </DialogTitle>
            <DialogDescription>
              This permanently deletes the data and cannot be undone. Type{' '}
              <span className="font-mono font-semibold">CLEAR</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-clear">Confirmation</Label>
            <Input
              id="confirm-clear"
              autoComplete="off"
              placeholder="CLEAR"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={clearMutation.isPending}
              disabled={confirmText !== 'CLEAR'}
              onClick={() => target && clearMutation.mutate(target.section)}
            >
              <Trash2 />
              Permanently clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
