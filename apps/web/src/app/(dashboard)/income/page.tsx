'use client';

import { useEffect, useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  IncomeSource,
  PaymentMethod,
  UserRole,
  type ApiSuccess,
  type CreateIncomeInput,
  type IncomeDto,
} from '@community-finance/shared';
import { apiClient, apiErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { formatDate, inr } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const SOURCE_LABELS: Record<IncomeSource, string> = {
  [IncomeSource.SUBSCRIPTION]: 'Subscription',
  [IncomeSource.DONATION]: 'Donation',
  [IncomeSource.SPONSORSHIP]: 'Sponsorship',
  [IncomeSource.TEMPLE]: 'Temple income',
  [IncomeSource.EVENT]: 'Event income',
  [IncomeSource.MISC]: 'Miscellaneous',
};

export default function IncomePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;

  const [page, setPage] = useState(1);
  const [source, setSource] = useState<IncomeSource | 'ALL'>('ALL');
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['income', { page, source }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<IncomeDto[]>>('/income', {
        params: {
          page,
          limit: 20,
          ...(source !== 'ALL' ? { source } : {}),
        },
      });
      return res.data;
    },
  });
  const incomes = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader
        title="Income"
        description="Subscriptions, donations, sponsorships, and other income"
        actions={
          isAdmin && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus />
              Record income
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <Select
              value={source}
              onValueChange={(v) => {
                setSource(v as IncomeSource | 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All sources</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : incomes.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No income records"
              description="Subscription payments appear automatically; record donations and other income here."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomes.map((income) => (
                    <TableRow key={income.id}>
                      <TableCell>
                        <Badge variant="secondary">{SOURCE_LABELS[income.source]}</Badge>
                      </TableCell>
                      <TableCell className="max-w-72">
                        <p className="truncate text-sm">
                          {income.donorName ?? income.sponsorName ?? income.description ?? '—'}
                        </p>
                        {income.eventName && (
                          <p className="text-xs text-muted-foreground">{income.eventName}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-success">
                        +{inr(income.amount)}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {income.method.toLowerCase()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(income.receivedAt)}
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

      <RecordIncomeDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

const incomeFormSchema = z
  .object({
    source: z.nativeEnum(IncomeSource),
    amount: z.coerce.number().positive('Enter a valid amount'),
    method: z.nativeEnum(PaymentMethod),
    donorName: z.string().max(150).optional(),
    sponsorName: z.string().max(150).optional(),
    description: z.string().max(1000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.source === IncomeSource.DONATION && !v.donorName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['donorName'],
        message: 'Donor name is required',
      });
    }
    if (v.source === IncomeSource.SPONSORSHIP && !v.sponsorName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sponsorName'],
        message: 'Sponsor name is required',
      });
    }
  });
type IncomeFormValues = z.infer<typeof incomeFormSchema>;

function RecordIncomeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: CreateIncomeInput) => {
      const res = await apiClient.post<ApiSuccess<IncomeDto>>('/income', input);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Income recorded');
      void qc.invalidateQueries({ queryKey: ['income'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      source: IncomeSource.DONATION,
      amount: 0,
      method: PaymentMethod.CASH,
      donorName: '',
      sponsorName: '',
      description: '',
    },
  });

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  const source = form.watch('source');

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync({
      source: values.source,
      amount: values.amount,
      method: values.method,
      donorName: values.donorName || undefined,
      sponsorName: values.sponsorName || undefined,
      description: values.description || undefined,
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record income</DialogTitle>
          <DialogDescription>
            Donations, sponsorships, temple income, or miscellaneous receipts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={source}
                onValueChange={(v) => form.setValue('source', v as IncomeSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS)
                    .filter(([v]) => v !== IncomeSource.SUBSCRIPTION)
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="i-amount">Amount (₹)</Label>
              <Input id="i-amount" type="number" min="1" step="0.01" {...form.register('amount')} />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
          </div>

          {source === IncomeSource.DONATION && (
            <div className="space-y-2">
              <Label htmlFor="i-donor">Donor name</Label>
              <Input id="i-donor" {...form.register('donorName')} />
              {form.formState.errors.donorName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.donorName.message}
                </p>
              )}
            </div>
          )}
          {source === IncomeSource.SPONSORSHIP && (
            <div className="space-y-2">
              <Label htmlFor="i-sponsor">Sponsor name</Label>
              <Input id="i-sponsor" {...form.register('sponsorName')} />
              {form.formState.errors.sponsorName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.sponsorName.message}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={form.watch('method')}
                onValueChange={(v) => form.setValue('method', v as PaymentMethod)}
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
            <div className="space-y-2">
              <Label htmlFor="i-desc">Description</Label>
              <Textarea id="i-desc" rows={1} {...form.register('description')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Record income
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
