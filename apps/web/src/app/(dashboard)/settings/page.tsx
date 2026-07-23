'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, LogOut, MonitorSmartphone, Plus, X } from 'lucide-react';
import {
  UserRole,
  toRupees,
  type ApiSuccess,
  type FeeConfigDto,
  type SessionDto,
} from '@community-finance/shared';
import { apiClient, apiErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatDateTime, inr } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SettingsData {
  expenseCategories: string[];
  billMandatoryThreshold: number;
  notificationPrefs: Record<string, boolean>;
  razorpayConfigured: boolean;
  razorpayKeyIdMasked?: string;
  theme: string;
  language: string;
}

const VALID_TABS = ['fees', 'payments', 'categories', 'account', 'sessions'];

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const searchParams = useSearchParams();

  // Deep-linkable tabs: /settings?tab=sessions etc.
  const requested = searchParams.get('tab');
  const defaultTab =
    requested && VALID_TABS.includes(requested) ? requested : isSuperAdmin ? 'fees' : 'account';

  return (
    <div>
      <PageHeader title="Settings" description="Community configuration and your account" />
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {isSuperAdmin && <TabsTrigger value="fees">Monthly fee</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="payments">Razorpay</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="categories">Categories</TabsTrigger>}
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="sessions">Devices</TabsTrigger>
        </TabsList>

        {isSuperAdmin && (
          <TabsContent value="fees">
            <FeeSettings />
          </TabsContent>
        )}
        {isSuperAdmin && (
          <TabsContent value="payments">
            <RazorpaySettings />
          </TabsContent>
        )}
        {isSuperAdmin && (
          <TabsContent value="categories">
            <CategorySettings />
          </TabsContent>
        )}
        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Fee configuration ---------------- */

function FeeSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['fee-config'],
    queryFn: async () => {
      const res = await apiClient.get<
        ApiSuccess<{ current: FeeConfigDto | null; history: FeeConfigDto[] }>
      >('/settings/fee-config');
      return res.data.data;
    },
  });

  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [grace, setGrace] = useState('5');
  const [lateFee, setLateFee] = useState('0');

  useEffect(() => {
    if (data?.current) {
      setAmount(String(toRupees(data.current.amount)));
      setDueDay(String(data.current.dueDay));
      setGrace(String(data.current.gracePeriodDays));
      setLateFee(String(toRupees(data.current.lateFee)));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.put('/settings/fee-config', {
        amount: Number(amount),
        dueDay: Number(dueDay),
        gracePeriodDays: Number(grace),
        lateFee: Number(lateFee),
      });
    },
    onSuccess: () => {
      toast.success('Monthly fee updated — members will pay the new amount from now on');
      void qc.invalidateQueries({ queryKey: ['fee-config'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monthly subscription</CardTitle>
          <CardDescription>
            Changes create a new fee version — history is never overwritten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fee-amount">Amount (₹ / month)</Label>
              <Input
                id="fee-amount"
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee-due">Due day of month</Label>
              <Input
                id="fee-due"
                type="number"
                min="1"
                max="28"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee-grace">Grace period (days)</Label>
              <Input
                id="fee-grace"
                type="number"
                min="0"
                max="28"
                value={grace}
                onChange={(e) => setGrace(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee-late">Late fee (₹, optional)</Label>
              <Input
                id="fee-late"
                type="number"
                min="0"
                value={lateFee}
                onChange={(e) => setLateFee(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            Save fee configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fee history</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.history.length ? (
            <p className="text-sm text-muted-foreground">No fee changes yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.history.map((h) => (
                <li key={h.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium tabular-nums">{inr(h.amount)}/month</span>
                  <span className="text-xs text-muted-foreground">
                    from {formatDate(h.effectiveFrom)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Razorpay ---------------- */

function RazorpaySettings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<SettingsData>>('/settings');
      return res.data.data;
    },
  });

  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.put('/settings/razorpay', { keyId, keySecret, webhookSecret });
    },
    onSuccess: () => {
      toast.success('Razorpay credentials saved (encrypted)');
      setKeyId('');
      setKeySecret('');
      setWebhookSecret('');
      void qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <KeyRound className="h-4 w-4" />
          Razorpay credentials
        </CardTitle>
        <CardDescription>
          {data?.razorpayConfigured
            ? `Configured (${data.razorpayKeyIdMasked}). Enter new keys to replace them — secrets are stored encrypted and never shown again.`
            : 'Add your Razorpay key pair to enable AutoPay subscriptions and online payments.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rzp-key">Key ID</Label>
          <Input
            id="rzp-key"
            placeholder="rzp_live_…"
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rzp-secret">Key secret</Label>
          <Input
            id="rzp-secret"
            type="password"
            value={keySecret}
            onChange={(e) => setKeySecret(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rzp-webhook">Webhook secret</Label>
          <Input
            id="rzp-webhook"
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
          />
        </div>
        <Button
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!keyId || !keySecret || !webhookSecret}
        >
          Save credentials
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------------- Expense categories ---------------- */

function CategorySettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<SettingsData>>('/settings');
      return res.data.data;
    },
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [threshold, setThreshold] = useState('');

  useEffect(() => {
    if (data) {
      setCategories(data.expenseCategories);
      setThreshold(String(toRupees(data.billMandatoryThreshold)));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/settings', {
        expenseCategories: categories,
        billMandatoryThreshold: Number(threshold),
      });
    },
    onSuccess: () => {
      toast.success('Settings saved');
      void qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-sm">Expense categories</CardTitle>
        <CardDescription>
          Categories available when recording expenses, plus the bill-mandatory threshold.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1 pr-1">
              {c}
              <button
                type="button"
                aria-label={`Remove ${c}`}
                className="rounded-full p-0.5 hover:bg-background/60"
                onClick={() => setCategories((prev) => prev.filter((x) => x !== c))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="New category…"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const v = newCategory.trim();
                if (v && !categories.includes(v)) setCategories((prev) => [...prev, v]);
                setNewCategory('');
              }
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              const v = newCategory.trim();
              if (v && !categories.includes(v)) setCategories((prev) => [...prev, v]);
              setNewCategory('');
            }}
          >
            <Plus />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat-threshold">Bill mandatory above (₹)</Label>
          <Input
            id="cat-threshold"
            type="number"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Expenses at or above this amount require a bill upload. Set 0 to disable.
          </p>
        </div>
        <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------------- Account (change password) ---------------- */

function AccountSettings() {
  const { user, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/change-password', {
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      });
    },
    onSuccess: () => {
      toast.success('Password changed — please sign in again');
      void logout();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-sm">Your account</CardTitle>
        <CardDescription>
          {user?.name} · {user?.phone} ·{' '}
          <span className="capitalize">{user?.role.replace('_', ' ').toLowerCase()}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pw-current">Current password</Label>
          <Input
            id="pw-current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pw-new">New password</Label>
            <Input
              id="pw-new"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw-confirm">Confirm new password</Label>
            <Input
              id="pw-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
        <Button
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!current || !next || next !== confirm}
        >
          Change password
        </Button>
        <p className="text-xs text-muted-foreground">
          Changing your password signs you out of every device.
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------------- Sessions / devices ---------------- */

function SessionSettings() {
  const qc = useQueryClient();
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<SessionDto[]>>('/auth/sessions');
      return res.data.data;
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/auth/sessions/${id}`);
    },
    onSuccess: () => {
      toast.success('Session revoked');
      void qc.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout-all');
    },
    onSuccess: () => {
      toast.success('Signed out everywhere');
      window.location.href = '/login';
    },
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card className="max-w-2xl">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm">Active sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
        </div>
        <Button variant="destructive" size="sm" onClick={() => logoutAllMutation.mutate()}>
          <LogOut />
          Sign out everywhere
        </Button>
      </CardHeader>
      <CardContent>
        {!sessions?.length ? (
          <p className="text-sm text-muted-foreground">No active sessions.</p>
        ) : (
          <ul className="divide-y">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <MonitorSmartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {s.browser} on {s.os}
                    {s.current && (
                      <Badge variant="success" className="ml-2">
                        This device
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.ip} · Last active {formatDateTime(s.lastUsedAt)}
                  </p>
                </div>
                {!s.current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => revokeMutation.mutate(s.id)}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
