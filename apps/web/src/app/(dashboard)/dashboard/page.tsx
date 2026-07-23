'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ApiSuccess, DashboardStatsDto } from '@community-finance/shared';
import { toRupees } from '@community-finance/shared';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { formatDate, inr } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<DashboardStatsDto>>('/dashboard');
      return res.data.data;
    },
  });

  if (isLoading || !stats) {
    return (
      <div>
        <Skeleton className="mb-6 h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const monthUp = stats.monthlyComparison.changePercent >= 0;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0] ?? ''}`}
        description="Your community's finances at a glance"
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Current balance"
          value={inr(stats.currentBalance)}
          sub={`${stats.activeMembers} active members`}
        />
        <StatCard
          icon={TrendingUp}
          label="Collection this month"
          value={inr(stats.monthlyCollection)}
          sub={
            <span className={monthUp ? 'text-success' : 'text-destructive'}>
              {monthUp ? (
                <ArrowUpRight className="mr-0.5 inline h-3 w-3" />
              ) : (
                <ArrowDownRight className="mr-0.5 inline h-3 w-3" />
              )}
              {Math.abs(stats.monthlyComparison.changePercent)}% vs last month
            </span>
          }
        />
        <StatCard
          icon={TrendingDown}
          label="Expenses this month"
          value={inr(stats.monthlyExpenses)}
          sub={`Pending collection ${inr(stats.pendingCollection)}`}
        />
        <StatCard
          icon={Users}
          label="Paid members"
          value={`${stats.paidMembersThisMonth}/${stats.activeMembers}`}
          sub={
            stats.failedPaymentsThisMonth > 0
              ? `${stats.failedPaymentsThisMonth} failed payment(s)`
              : 'No failed payments'
          }
        />
      </div>

      {/* Trends */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Collection trend (12 months)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.collectionTrend.map(toChartPoint)}>
                <defs>
                  <linearGradient id="fillCollection" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={compactINR}
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#fillCollection)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Expense trend (12 months)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.expenseTrend.map(toChartPoint)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={compactINR}
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)' }} />
                <Bar dataKey="amount" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Top expense categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top expense categories</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topExpenseCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved expenses yet.</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.topExpenseCategories}
                        dataKey="amount"
                        nameKey="category"
                        innerRadius={38}
                        outerRadius={60}
                        paddingAngle={3}
                      >
                        {stats.topExpenseCategories.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip nameKey="category" />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="min-w-0 flex-1 space-y-1.5">
                  {stats.topExpenseCategories.map((c, i) => (
                    <li key={c.category} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="truncate">{c.category}</span>
                      <span className="ml-auto font-medium tabular-nums">{inr(c.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Upcoming events</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            ) : (
              <ul className="space-y-3">
                {stats.upcomingEvents.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/events/${e.id}`}
                      className="flex items-center gap-3 rounded-md p-1.5 -m-1.5 hover:bg-muted/60"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(e.date)} · {inr(e.budget)} budget
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Yearly comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Yearly comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ComparisonRow
              label="This year's income"
              value={stats.yearlyComparison.current}
              change={stats.yearlyComparison.changePercent}
            />
            <ComparisonRow label="Last year's income" value={stats.yearlyComparison.previous} />
            <ComparisonRow
              label="This month vs last"
              value={stats.monthlyComparison.current}
              change={stats.monthlyComparison.changePercent}
            />
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                Balance updates instantly with every approved payment, expense, and adjustment.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function toChartPoint(p: { period: string; amount: number }) {
  return { period: p.period.slice(2), amount: toRupees(p.amount) };
}

function compactINR(value: number): string {
  if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(1)}L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

function ChartTooltip({
  active,
  payload,
  label,
  nameKey,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: Record<string, unknown> }>;
  label?: string;
  nameKey?: string;
}) {
  if (!active || !payload?.length) return null;
  const first = payload[0]!;
  const name = nameKey ? String(first.payload[nameKey]) : label;
  const rupees = nameKey ? toRupees(first.value) : first.value;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="text-muted-foreground">{name}</p>
      <p className="font-semibold tabular-nums">
        ₹{rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ComparisonRow({
  label,
  value,
  change,
}: {
  label: string;
  value: number;
  change?: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">{inr(value)}</span>
        {change !== undefined && (
          <span
            className={`text-xs font-medium ${change >= 0 ? 'text-success' : 'text-destructive'}`}
          >
            {change >= 0 ? '+' : ''}
            {change}%
          </span>
        )}
      </span>
    </div>
  );
}
