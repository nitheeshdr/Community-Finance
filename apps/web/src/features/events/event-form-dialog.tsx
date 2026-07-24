'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { IndianRupee, Search, Wallet, Users as UsersIcon } from 'lucide-react';
import {
  EventCategory,
  EventFundingMode,
  UserRole,
  UserStatus,
  toPaise,
  toRupees,
  type ApiSuccess,
  type EventDto,
  type MemberDto,
} from '@community-finance/shared';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { cn, inr } from '@/lib/utils';
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
  budget: z.coerce.number().min(0),
  collectAmount: z.coerce.number().min(0),
  fundingMode: z.nativeEnum(EventFundingMode),
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

  // Active members for participant selection (SPLIT mode).
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['members', 'active-picker'],
    enabled: open,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<MemberDto[]>>('/members', {
        params: { page: 1, limit: 100, status: UserStatus.ACTIVE, role: UserRole.MEMBER },
      });
      return res.data.data;
    },
  });

  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: EventCategory.OTHER,
      date: '',
      budget: 0,
      collectAmount: 0,
      fundingMode: EventFundingMode.SPLIT,
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
        collectAmount: event?.collectAmountPerMember ? toRupees(event.collectAmountPerMember) : 0,
        fundingMode: event?.fundingMode ?? EventFundingMode.SPLIT,
        budgetOverride: event?.budgetOverride ?? false,
      });
      // Rebuild the excluded set from the event's participant scope.
      setExcluded(new Set());
      setSearch('');
    }
  }, [open, event, form]);

  const allMembers = members ?? [];
  // When editing an event that had a specific scope, seed exclusions.
  useEffect(() => {
    if (open && event && event.participantIds.length > 0 && allMembers.length > 0) {
      const included = new Set(event.participantIds);
      setExcluded(new Set(allMembers.filter((m) => !included.has(m.id)).map((m) => m.id)));
    }
  }, [open, event, allMembers]);

  const fundingMode = form.watch('fundingMode');
  const budget = form.watch('budget');
  const collectAmount = form.watch('collectAmount');
  const isCollect = fundingMode === EventFundingMode.COLLECT;
  const isSplit = fundingMode === EventFundingMode.SPLIT;
  const showParticipants = isSplit || isCollect;

  const participants = useMemo(
    () => allMembers.filter((m) => !excluded.has(m.id)),
    [allMembers, excluded]
  );
  const perHead = isCollect
    ? toPaise(Number(collectAmount) || 0)
    : isSplit && participants.length > 0
      ? Math.ceil(toPaise(Number(budget) || 0) / participants.length)
      : 0;

  const filteredMembers = useMemo(() => {
    if (!search) return allMembers;
    const q = search.toLowerCase();
    return allMembers.filter(
      (m) => m.name.toLowerCase().includes(q) || m.phone.includes(search)
    );
  }, [allMembers, search]);

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const collect = values.fundingMode === EventFundingMode.COLLECT;
    const split = values.fundingMode === EventFundingMode.SPLIT;

    if (collect) {
      if (!(Number(values.collectAmount) > 0)) {
        form.setError('collectAmount', { message: 'Enter the amount per member' });
        return;
      }
      if (participants.length === 0) return;
    } else if (!(Number(values.budget) > 0)) {
      form.setError('budget', { message: 'Enter a valid budget' });
      return;
    }

    const participantIds =
      (split && excluded.size > 0) || collect ? participants.map((m) => m.id) : [];
    const payload = {
      name: values.name,
      description: values.description || undefined,
      category: values.category,
      date: new Date(values.date),
      fundingMode: values.fundingMode,
      participantIds,
      budgetOverride: values.budgetOverride,
      ...(collect
        ? { collectAmountPerMember: values.collectAmount }
        : { budget: values.budget }),
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit event' : 'Create event'}</DialogTitle>
          <DialogDescription>
            Choose how the event is funded — from the community balance, or split among members.
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

          {/* Funding mode selector */}
          <div className="space-y-2">
            <Label>Funding</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              <FundingOption
                selected={isSplit}
                onClick={() => form.setValue('fundingMode', EventFundingMode.SPLIT)}
                icon={<UsersIcon className="h-4 w-4" />}
                title="Split among members"
                description="Share a budget equally"
              />
              <FundingOption
                selected={fundingMode === EventFundingMode.BALANCE}
                onClick={() => form.setValue('fundingMode', EventFundingMode.BALANCE)}
                icon={<Wallet className="h-4 w-4" />}
                title="From community balance"
                description="No member contributions"
              />
              <FundingOption
                selected={isCollect}
                onClick={() => form.setValue('fundingMode', EventFundingMode.COLLECT)}
                icon={<IndianRupee className="h-4 w-4" />}
                title="Collect payment"
                description="Fixed amount each member pays"
              />
            </div>
          </div>

          {/* Amount: budget for Split/Balance, per-member for Collect */}
          {isCollect ? (
            <div className="space-y-2">
              <Label htmlFor="e-collect">Amount per member (₹)</Label>
              <Input
                id="e-collect"
                type="number"
                min="1"
                step="0.01"
                {...form.register('collectAmount')}
              />
              {form.formState.errors.collectAmount && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.collectAmount.message}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="e-budget">Budget (₹)</Label>
              <Input id="e-budget" type="number" min="1" step="0.01" {...form.register('budget')} />
              {form.formState.errors.budget && (
                <p className="text-xs text-destructive">{form.formState.errors.budget.message}</p>
              )}
            </div>
          )}

          {/* Participant selection (SPLIT + COLLECT) */}
          {showParticipants && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm">
                  {isCollect ? 'Collect from' : 'Participants'} ({participants.length}/
                  {allMembers.length})
                </Label>
                <p className="text-sm font-medium">
                  {isCollect ? 'Each: ' : 'Per member: '}
                  <span className="tabular-nums text-primary">{inr(perHead)}</span>
                  {isCollect && (
                    <span className="text-muted-foreground">
                      {' '}
                      · Total {inr(perHead * participants.length)}
                    </span>
                  )}
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search members to include/exclude…"
                  className="h-8 pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setExcluded(new Set())}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setExcluded(new Set(allMembers.map((m) => m.id)))}
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {filteredMembers.map((m) => {
                  const included = !excluded.has(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/60"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={included}
                        onChange={() => toggle(m.id)}
                      />
                      <span className={cn('flex-1 text-sm', !included && 'text-muted-foreground line-through')}>
                        {m.name}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">{m.phone}</span>
                    </label>
                  );
                })}
                {membersLoading && (
                  <p className="py-3 text-center text-xs text-muted-foreground">Loading members…</p>
                )}
                {!membersLoading && allMembers.length === 0 && (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    No active members yet. Add members first, or use “From community balance”.
                  </p>
                )}
                {!membersLoading && allMembers.length > 0 && filteredMembers.length === 0 && (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    No members match “{search}”.
                  </p>
                )}
              </div>
              {!membersLoading && allMembers.length > 0 && participants.length === 0 && (
                <p className="text-xs text-destructive">Select at least one participant.</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="e-desc">Description (optional)</Label>
            <Textarea id="e-desc" rows={2} {...form.register('description')} />
          </div>

          {user?.role === UserRole.SUPER_ADMIN && fundingMode === EventFundingMode.SPLIT && (
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
            <Button
              type="submit"
              loading={pending}
              disabled={showParticipants && participants.length === 0}
            >
              {isEdit ? 'Save changes' : 'Create event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FundingOption({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 items-center justify-center rounded-md',
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
