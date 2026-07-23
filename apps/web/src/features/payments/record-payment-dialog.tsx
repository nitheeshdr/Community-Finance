'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PaymentMethod,
  PaymentType,
  type MemberDto,
} from '@community-finance/shared';
import { apiClient } from '@/lib/api-client';
import type { ApiSuccess } from '@community-finance/shared';
import { useQuery } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { useRecordPayment } from './api';

const formSchema = z.object({
  memberId: z.string().min(1, 'Select a member'),
  type: z.nativeEnum(PaymentType),
  method: z.enum([PaymentMethod.CASH, PaymentMethod.UPI]),
  amount: z.coerce.number().positive('Enter a valid amount'),
  period: z.string().optional(),
  upiReference: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  defaultMemberId,
  defaultEventId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMemberId?: string;
  defaultEventId?: string;
}) {
  const recordMutation = useRecordPayment();
  const [memberSearch, setMemberSearch] = useState('');

  // Lightweight member picker.
  const { data: memberData } = useQuery({
    queryKey: ['members', 'picker', memberSearch],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<MemberDto[]>>('/members', {
        params: { page: 1, limit: 50, ...(memberSearch ? { search: memberSearch } : {}) },
      });
      return res.data.data;
    },
    enabled: open,
  });
  const members = memberData ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: defaultMemberId ?? '',
      type: defaultEventId ? PaymentType.EVENT_CONTRIBUTION : PaymentType.SUBSCRIPTION,
      method: PaymentMethod.CASH,
      amount: 0,
      period: currentPeriod(),
      upiReference: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        memberId: defaultMemberId ?? '',
        type: defaultEventId ? PaymentType.EVENT_CONTRIBUTION : PaymentType.SUBSCRIPTION,
        method: PaymentMethod.CASH,
        amount: 0,
        period: currentPeriod(),
        upiReference: '',
        notes: '',
      });
    }
  }, [open, defaultMemberId, defaultEventId, form]);

  const type = form.watch('type');
  const method = form.watch('method');

  const onSubmit = form.handleSubmit(async (values) => {
    await recordMutation.mutateAsync({
      memberId: values.memberId,
      type: values.type,
      method: values.method,
      amount: values.amount,
      period: values.type === PaymentType.SUBSCRIPTION ? values.period : undefined,
      eventId: values.type === PaymentType.EVENT_CONTRIBUTION ? defaultEventId : undefined,
      upiReference: values.method === PaymentMethod.UPI ? values.upiReference : undefined,
      notes: values.notes || undefined,
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Manual cash/UPI entry. It enters the approval queue before it counts toward
            collections.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>Member</Label>
            <Input
              placeholder="Search member…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="mb-1"
            />
            <Select
              value={form.watch('memberId')}
              onValueChange={(v) => form.setValue('memberId', v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} · {m.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.memberId && (
              <p className="text-xs text-destructive">{form.formState.errors.memberId.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment type</Label>
              <Select
                value={type}
                onValueChange={(v) => form.setValue('type', v as PaymentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentType.SUBSCRIPTION}>Monthly subscription</SelectItem>
                  {defaultEventId && (
                    <SelectItem value={PaymentType.EVENT_CONTRIBUTION}>
                      Event contribution
                    </SelectItem>
                  )}
                  <SelectItem value={PaymentType.DONATION}>Donation</SelectItem>
                  <SelectItem value={PaymentType.SPONSORSHIP}>Sponsorship</SelectItem>
                  <SelectItem value={PaymentType.MISC}>Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={method}
                onValueChange={(v) => form.setValue('method', v as PaymentMethod.CASH | PaymentMethod.UPI)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                  <SelectItem value={PaymentMethod.UPI}>UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-amount">Amount (₹)</Label>
              <Input id="p-amount" type="number" min="1" step="0.01" {...form.register('amount')} />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
            {type === PaymentType.SUBSCRIPTION && (
              <div className="space-y-2">
                <Label htmlFor="p-period">Period</Label>
                <Input id="p-period" type="month" {...form.register('period')} />
              </div>
            )}
            {method === PaymentMethod.UPI && (
              <div className="space-y-2">
                <Label htmlFor="p-upi">UPI reference</Label>
                <Input id="p-upi" placeholder="UTR / transaction id" {...form.register('upiReference')} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-notes">Notes (optional)</Label>
            <Textarea id="p-notes" rows={2} {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={recordMutation.isPending}>
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
