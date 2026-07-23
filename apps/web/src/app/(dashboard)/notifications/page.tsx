'use client';

import { useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, CheckCheck, Megaphone, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  NotificationType,
  UserRole,
  type ApiSuccess,
  type NotificationDto,
} from '@community-finance/shared';
import { apiClient, apiErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { cn, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationControls } from '@/components/shared/pagination-controls';
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
import { Textarea } from '@/components/ui/textarea';

const TYPE_ICON_COLOR: Partial<Record<NotificationType, string>> = {
  [NotificationType.PAYMENT_SUCCESS]: 'bg-success/15 text-success',
  [NotificationType.PAYMENT_FAILED]: 'bg-destructive/15 text-destructive',
  [NotificationType.PAYMENT_REMINDER]: 'bg-warning/20 text-foreground',
  [NotificationType.EMERGENCY]: 'bg-destructive/15 text-destructive',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [composeOpen, setComposeOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<NotificationDto[]>>('/notifications', {
        params: { page, limit: 20 },
      });
      return res.data;
    },
  });
  const notifications = data?.data ?? [];
  const meta = data?.meta;

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/notifications/read-all');
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Payment updates, event news, and announcements"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => markAllMutation.mutate()}>
              <CheckCheck />
              Mark all read
            </Button>
            {isAdmin && (
              <Button onClick={() => setComposeOpen(true)}>
                <Plus />
                Announcement
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="Payment updates and announcements will appear here."
            />
          ) : (
            <>
              <ul className="divide-y">
                {notifications.map((n) => (
                  <NotificationRow key={n.id} notification={n} />
                ))}
              </ul>
              {meta && <PaginationControls meta={meta} onPageChange={setPage} />}
            </>
          )}
        </CardContent>
      </Card>

      <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </div>
  );
}

function NotificationRow({ notification }: { notification: NotificationDto }) {
  const qc = useQueryClient();
  const markMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/notifications/${notification.id}/read`);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <li>
      <button
        type="button"
        className={cn(
          'flex w-full items-start gap-3 px-1 py-3 text-left transition-colors hover:bg-muted/40',
          !notification.read && 'bg-primary/[0.03]'
        )}
        onClick={() => !notification.read && markMutation.mutate()}
      >
        <div
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            TYPE_ICON_COLOR[notification.type] ?? 'bg-muted text-muted-foreground'
          )}
        >
          <Bell className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn('text-sm', !notification.read && 'font-semibold')}>
              {notification.title}
            </p>
            {!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{notification.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(notification.createdAt)}
          </p>
        </div>
      </button>
    </li>
  );
}

const composeSchema = z.object({
  type: z.enum([NotificationType.ANNOUNCEMENT, NotificationType.EMERGENCY]),
  title: z.string().trim().min(2).max(150),
  body: z.string().trim().min(2).max(2000),
});
type ComposeValues = z.infer<typeof composeSchema>;

function ComposeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: ComposeValues) => {
      await apiClient.post('/notifications', input);
    },
    onSuccess: () => {
      toast.success('Announcement sent to all members');
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const form = useForm<ComposeValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: { type: NotificationType.ANNOUNCEMENT, title: '', body: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
    form.reset();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Send announcement
          </DialogTitle>
          <DialogDescription>Broadcast to every member of the community.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(v) => form.setValue('type', v as ComposeValues['type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NotificationType.ANNOUNCEMENT}>General announcement</SelectItem>
                <SelectItem value={NotificationType.EMERGENCY}>Emergency alert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="n-title">Title</Label>
            <Input id="n-title" {...form.register('title')} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="n-body">Message</Label>
            <Textarea id="n-body" rows={4} {...form.register('body')} />
            {form.formState.errors.body && (
              <p className="text-xs text-destructive">{form.formState.errors.body.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Send
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
