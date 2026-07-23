'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  EventCategory,
  UserRole,
  toRupees,
  type EventDto,
} from '@community-finance/shared';
import { useAuth } from '@/lib/auth-context';
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
import { useCreateEvent, useUpdateEvent } from './api';

const CATEGORY_LABELS: Record<EventCategory, string> = {
  [EventCategory.TEMPLE_FESTIVAL]: 'Temple festival',
  [EventCategory.SPORTS]: 'Sports event',
  [EventCategory.ANNUAL_MEETING]: 'Annual meeting',
  [EventCategory.CHARITY]: 'Charity',
  [EventCategory.EMERGENCY_COLLECTION]: 'Emergency collection',
  [EventCategory.OTHER]: 'Other',
};

const formSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(150),
  description: z.string().max(2000).optional(),
  category: z.nativeEnum(EventCategory),
  date: z.string().min(1, 'Date is required'),
  budget: z.coerce.number().positive('Enter a valid budget'),
  budgetOverride: z.boolean(),
});
type FormValues = z.infer<typeof formSchema>;

export function EventFormDialog({
  open,
  onOpenChange,
  event,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventDto | null;
}) {
  const { user } = useAuth();
  const isEdit = Boolean(event);
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent(event?.id ?? '');
  const pending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: EventCategory.OTHER,
      date: '',
      budget: 0,
      budgetOverride: false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: event?.name ?? '',
        description: event?.description ?? '',
        category: event?.category ?? EventCategory.OTHER,
        date: event ? event.date.slice(0, 10) : '',
        budget: event ? toRupees(event.budget) : 0,
        budgetOverride: event?.budgetOverride ?? false,
      });
    }
  }, [open, event, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      category: values.category,
      date: new Date(values.date),
      budget: values.budget,
      budgetOverride: values.budgetOverride,
    };
    if (isEdit && event) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync({ ...payload, images: [] });
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit event' : 'Create event'}</DialogTitle>
          <DialogDescription>
            The budget is split equally across all active members and recalculates
            automatically when membership changes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="e-name">Event name</Label>
            <Input id="e-name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(v) => form.setValue('category', v as EventCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-date">Date</Label>
              <Input id="e-date" type="date" {...form.register('date')} />
              {form.formState.errors.date && (
                <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="e-budget">Budget (₹)</Label>
            <Input id="e-budget" type="number" min="1" step="0.01" {...form.register('budget')} />
            {form.formState.errors.budget && (
              <p className="text-xs text-destructive">{form.formState.errors.budget.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="e-desc">Description (optional)</Label>
            <Textarea id="e-desc" rows={3} {...form.register('description')} />
          </div>

          {user?.role === UserRole.SUPER_ADMIN && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.watch('budgetOverride')}
                onChange={(e) => form.setValue('budgetOverride', e.target.checked)}
              />
              Allow budget above available balance (super admin override)
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {isEdit ? 'Save changes' : 'Create event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
