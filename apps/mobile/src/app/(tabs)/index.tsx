import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PaymentStatus } from '@community-finance/shared';
import { Logo } from '@/components/logo';
import { useAuth } from '@/lib/auth-context';
import { formatDate, inr, periodLabel } from '@/lib/format';
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
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-d" edges={['top']}>
      <ScrollView
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        {/* Top app bar */}
        <View className="mb-5 mt-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Logo size={42} />
            <View>
              <Text className="text-xs text-on-surface-variant dark:text-on-surface-variant-d">
                Welcome back
              </Text>
              <Text className="text-lg font-bold text-on-surface dark:text-on-surface-d">
                {user?.name.split(' ')[0]}
              </Text>
            </View>
          </View>
          <Link href="/more" asChild>
            <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-surface-container dark:bg-surface-container-d">
              <MaterialCommunityIcons name="bell-outline" size={20} color="#777680" />
              {(unread ?? 0) > 0 && (
                <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-error dark:bg-error-d" />
              )}
            </Pressable>
          </Link>
        </View>

        {/* Balance hero — M3 primary surface, 28dp radius */}
        <View className="rounded-m3-xl bg-primary p-6 dark:bg-primary-container-d">
          <Text className="text-xs font-medium uppercase tracking-wider text-primary-container dark:text-on-primary-container-d">
            Community balance
          </Text>
          <Text className="mt-1 text-[34px] font-bold leading-10 text-on-primary tabular-nums dark:text-on-primary-container-d">
            {isLoading ? '…' : inr(stats?.currentBalance ?? 0)}
          </Text>
          <View className="mt-5 flex-row gap-6">
            <View>
              <Text className="text-[11px] text-primary-container dark:text-on-primary-container-d">
                Collected
              </Text>
              <Text className="text-sm font-semibold text-on-primary tabular-nums dark:text-on-primary-container-d">
                {inr(stats?.monthlyCollection ?? 0)}
              </Text>
            </View>
            <View>
              <Text className="text-[11px] text-primary-container dark:text-on-primary-container-d">
                Spent
              </Text>
              <Text className="text-sm font-semibold text-on-primary tabular-nums dark:text-on-primary-container-d">
                {inr(stats?.monthlyExpenses ?? 0)}
              </Text>
            </View>
            <View>
              <Text className="text-[11px] text-primary-container dark:text-on-primary-container-d">
                Members paid
              </Text>
              <Text className="text-sm font-semibold text-on-primary tabular-nums dark:text-on-primary-container-d">
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
                  <Text className="text-sm font-semibold text-on-surface dark:text-on-surface-d">
                    {p.type === 'SUBSCRIPTION'
                      ? `Subscription · ${periodLabel(p.period)}`
                      : (p.eventName ?? p.type.toLowerCase())}
                  </Text>
                  <Text className="mt-0.5 text-xs text-on-surface-variant dark:text-on-surface-variant-d">
                    Pay by cash/UPI to your admin, or use AutoPay
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="text-base font-bold text-on-surface tabular-nums dark:text-on-surface-d">
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
                <Text className="text-sm font-semibold text-primary dark:text-primary-d">
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
                  <View className="h-12 w-12 items-center justify-center rounded-m3-md bg-primary-container dark:bg-primary-container-d">
                    <MaterialCommunityIcons name="calendar-star" size={22} color="#4F46E5" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-on-surface dark:text-on-surface-d">
                      {e.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-on-surface-variant dark:text-on-surface-variant-d">
                      {formatDate(e.date)} · Budget {inr(e.budget)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-on-surface-variant dark:text-on-surface-variant-d">
                      Your share
                    </Text>
                    <Text className="text-sm font-bold text-on-surface tabular-nums dark:text-on-surface-d">
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
