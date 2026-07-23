'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import {
  DEFAULTS,
  PaymentMethod,
  toRupees,
  type ApiSuccess,
  type EventDto,
  type ExpenseDto,
} from '@community-finance/shared';
import { apiClient, apiErrorMessage } from '@/lib/api-client';
import { uploadToCloudinary } from '@/lib/upload';
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
import { useCreateExpense, useUpdateExpense } from './api';

const formSchema = z.object({
  eventId: z.string().min(1, 'Select an event'),
  name: z.string().trim().min(2, 'Name is too short').max(150),
  category: z.string().min(1, 'Select a category'),
  amount: z.coerce.number().positive('Enter a valid amount'),
  vendor: z.string().max(150).optional(),
  description: z.string().max(2000).optional(),
  paymentMode: z.nativeEnum(PaymentMethod),
});
type FormValues = z.infer<typeof formSchema>;

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  defaultEventId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseDto | null;
  defaultEventId?: string;
}) {
  const isEdit = Boolean(expense);
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense(expense?.id ?? '');
  const [bills, setBills] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const pending = createMutation.isPending || updateMutation.isPending;

  const { data: events } = useQuery({
    queryKey: ['events', 'picker'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<EventDto[]>>('/events', {
        params: { page: 1, limit: 100 },
      });
      return res.data.data;
    },
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventId: defaultEventId ?? '',
      name: '',
      category: '',
      amount: 0,
      vendor: '',
      description: '',
      paymentMode: PaymentMethod.CASH,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        eventId: expense?.eventId ?? defaultEventId ?? '',
        name: expense?.name ?? '',
        category: expense?.category ?? '',
        amount: expense ? toRupees(expense.amount) : 0,
        vendor: expense?.vendor ?? '',
        description: expense?.description ?? '',
        paymentMode: expense?.paymentMode ?? PaymentMethod.CASH,
      });
      setBills(expense?.bills ?? []);
    }
  }, [open, expense, defaultEventId, form]);

  async function handleFileSelect(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadToCloudinary(file, 'bills');
        setBills((prev) => [...prev, uploaded.url]);
      }
      toast.success('Bill uploaded');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      category: values.category,
      amount: values.amount,
      vendor: values.vendor || undefined,
      description: values.description || undefined,
      paymentMode: values.paymentMode,
      bills,
    };
    if (isEdit && expense) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync({ ...payload, eventId: values.eventId });
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit expense' : 'Add expense'}</DialogTitle>
          <DialogDescription>
            Every expense belongs to an event and needs approval before it affects the balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {!isEdit && (
            <div className="space-y-2">
              <Label>Event</Label>
              <Select
                value={form.watch('eventId')}
                onValueChange={(v) => form.setValue('eventId', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {(events ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.eventId && (
                <p className="text-xs text-destructive">{form.formState.errors.eventId.message}</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="x-name">Expense name</Label>
              <Input id="x-name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(v) => form.setValue('category', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULTS.EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="x-amount">Amount (₹)</Label>
              <Input id="x-amount" type="number" min="1" step="0.01" {...form.register('amount')} />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="x-vendor">Vendor</Label>
              <Input id="x-vendor" {...form.register('vendor')} />
            </div>
            <div className="space-y-2">
              <Label>Payment mode</Label>
              <Select
                value={form.watch('paymentMode')}
                onValueChange={(v) => form.setValue('paymentMode', v as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                  <SelectItem value={PaymentMethod.UPI}>UPI</SelectItem>
                  <SelectItem value={PaymentMethod.RAZORPAY}>Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="x-desc">Description (optional)</Label>
            <Textarea id="x-desc" rows={2} {...form.register('description')} />
          </div>

          <div className="space-y-2">
            <Label>Bills / invoices</Label>
            <div className="flex flex-wrap items-center gap-2">
              {bills.map((url, i) => (
                <span
                  key={url}
                  className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs"
                >
                  <FileText className="h-3 w-3" />
                  Bill {i + 1}
                  <button
                    type="button"
                    aria-label="Remove bill"
                    onClick={() => setBills((prev) => prev.filter((b) => b !== url))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {uploading ? 'Uploading…' : 'Upload bill'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => void handleFileSelect(e.target.files)}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending} disabled={uploading}>
              {isEdit ? 'Save changes' : 'Add expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
