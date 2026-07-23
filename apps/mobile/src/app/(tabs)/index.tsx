import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PaymentStatus } from '@community-finance/shared';
import { useAuth } from '@/lib/auth-context';
import { formatDate, initials, inr, periodLabel } from '@/lib/format';
import { useDashboard, useMyPayments, useUnreadCount } from '@/lib/queries';
import {
  Card,
  EmptyState,
  SectionTitle,
  StatCard,
  StatusBadge,
} from '@/components/ui';

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: stats, isLoading, refetch, isRefetching } = useDashboard();
  const { data: myPayments } = useMyPayments(user?.id, 1);
  const { data: unread } = useUnreadCount();

  const dues = (myPayments?.data ?? []).filter(
    (p) => p.status === PaymentStatus.PENDING || p.status === PaymentStatus.OVERDUE
  );

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <ScrollView
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        {/* Header */}
        <View className="mb-5 mt-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
              <Text className="text-base font-bold text-white">
                {user ? initials(user.name) : '…'}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-muted">Welcome back</Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {user?.name.split(' ')[0]}
              </Text>
            </View>
          </View>
          <Link href="/more" asChild>
            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-card dark:bg-card-dark">
              <MaterialCommunityIcons name="bell-outline" size={20} color="#6b7280" />
              {(unread ?? 0) > 0 && (
                <View className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-destructive" />
              )}
            </Pressable>
          </Link>
        </View>

        {/* Balance hero */}
        <View className="rounded-3xl bg-primary p-5">
          <Text className="text-xs font-medium uppercase tracking-wider text-indigo-200">
            Community balance
          </Text>
          <Text className="mt-1 text-3xl font-bold text-white tabular-nums">
            {isLoading ? '…' : inr(stats?.currentBalance ?? 0)}
          </Text>
          <View className="mt-4 flex-row gap-6">
            <View>
              <Text className="text-[11px] text-indigo-200">Collected this month</Text>
              <Text className="text-sm font-semibold text-white tabular-nums">
                {inr(stats?.monthlyCollection ?? 0)}
              </Text>
            </View>
            <View>
              <Text className="text-[11px] text-indigo-200">Spent this month</Text>
              <Text className="text-sm font-semibold text-white tabular-nums">
                {inr(stats?.monthlyExpenses ?? 0)}
              </Text>
            </View>
            <View>
              <Text className="text-[11px] text-indigo-200">Members paid</Text>
              <Text className="text-sm font-semibold text-white tabular-nums">
                {stats?.paidMembersThisMonth ?? 0}/{stats?.activeMembers ?? 0}
              </Text>
            </View>
          </View>
        </View>

        {/* My dues */}
        {dues.length > 0 && (
          <>
            <SectionTitle>My dues</SectionTitle>
            {dues.map((p) => (
              <Card key={p.id} className="mb-2 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                    {p.type === 'SUBSCRIPTION'
                      ? `Subscription · ${periodLabel(p.period)}`
                      : (p.eventName ?? p.type.toLowerCase())}
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted">
                    Pay by cash/UPI to your admin, or use AutoPay
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="text-base font-bold text-gray-900 tabular-nums dark:text-white">
                    {inr(p.amount)}
                  </Text>
                  <StatusBadge status={p.status} />
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Community transparency */}
        <SectionTitle>Community overview</SectionTitle>
        <View className="flex-row gap-3">
          <StatCard
            label="Pending collection"
            value={inr(stats?.pendingCollection ?? 0)}
            accent="warning"
          />
          <StatCard
            label="Active members"
            value={String(stats?.activeMembers ?? 0)}
            sub={`${stats?.totalMembers ?? 0} total`}
          />
        </View>
        <View className="mt-3 flex-row gap-3">
          <StatCard
            label="This month vs last"
            value={`${(stats?.monthlyComparison.changePercent ?? 0) >= 0 ? '+' : ''}${stats?.monthlyComparison.changePercent ?? 0}%`}
            accent={(stats?.monthlyComparison.changePercent ?? 0) >= 0 ? 'success' : 'destructive'}
          />
          <StatCard
            label="Failed payments"
            value={String(stats?.failedPaymentsThisMonth ?? 0)}
            accent={(stats?.failedPaymentsThisMonth ?? 0) > 0 ? 'destructive' : undefined}
          />
        </View>

        {/* Upcoming events */}
        <SectionTitle
          right={
            <Link href="/events" asChild>
              <Pressable>
                <Text className="text-sm font-medium text-primary dark:text-primary-dark">
                  See all
                </Text>
              </Pressable>
            </Link>
          }
        >
          Upcoming events
        </SectionTitle>
        {!stats?.upcomingEvents.length ? (
          <Card>
            <EmptyState
              icon="calendar-blank-outline"
              title="No upcoming events"
              description="New festivals and collections will appear here."
            />
          </Card>
        ) : (
          stats.upcomingEvents.map((e) => (
            <Link key={e.id} href={{ pathname: '/events/[id]', params: { id: e.id } }} asChild>
              <Pressable>
                <Card className="mb-2 flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950">
                    <MaterialCommunityIcons name="calendar-star" size={20} color="#4f46e5" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                      {e.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted">
                      {formatDate(e.date)} · Budget {inr(e.budget)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-muted">Your share</Text>
                    <Text className="text-sm font-bold text-gray-900 tabular-nums dark:text-white">
                      {inr(e.perHeadAmount)}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            </Link>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
