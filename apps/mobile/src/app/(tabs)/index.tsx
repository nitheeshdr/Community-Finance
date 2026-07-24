import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { PaymentStatus, type PaymentDto } from '@community-finance/shared';
import { Logo } from '@/components/logo';
import { useAuth } from '@/lib/auth-context';
import { formatDate, inr, periodLabel } from '@/lib/format';
import { payPendingPayment } from '@/lib/pay';
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
  const monthUp = (stats?.monthlyComparison.changePercent ?? 0) >= 0;

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-d" edges={['top']}>
      {/* Sticky top app bar */}
      <View className="z-10 flex-row items-center justify-between border-b border-outline-variant/40 bg-surface px-4 pb-3 pt-2 dark:border-outline-variant-d/40 dark:bg-surface-d">
        <View className="flex-row items-center gap-3">
          <Logo size={40} />
          <View>
            <Text className="text-xs text-on-surface-variant dark:text-on-surface-variant-d">
              Welcome back
            </Text>
            <Text className="text-lg font-bold leading-6 text-on-surface dark:text-on-surface-d">
              {user?.name.split(' ')[0]}
            </Text>
          </View>
        </View>
        <Link href="/notifications" asChild>
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full bg-surface-container dark:bg-surface-container-d"
            accessibilityLabel="Notifications"
          >
            <MaterialCommunityIcons name="bell-outline" size={20} color="#777680" />
            {(unread ?? 0) > 0 && (
              <View className="absolute right-1.5 top-1 min-w-[18px] items-center justify-center rounded-full bg-error px-1 py-0.5 dark:bg-error-d">
                <Text className="text-[10px] font-bold text-white dark:text-on-error-container">
                  {(unread ?? 0) > 9 ? '9+' : unread}
                </Text>
              </View>
            )}
          </Pressable>
        </Link>
      </View>

      <ScrollView
        contentContainerClassName="px-4 pb-8 pt-4"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        {/* Balance hero — brand primary with decorative rings */}
        <View className="overflow-hidden rounded-m3-xl bg-primary dark:bg-primary-container-d">
          <View className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10" />
          <View className="absolute -bottom-20 -left-8 h-48 w-48 rounded-full bg-white/5" />
          <View className="p-6">
            <View className="flex-row items-center gap-2">
              <MaterialCommunityIcons name="wallet-outline" size={16} color="#FFDAD9" />
              <Text className="text-xs font-medium uppercase tracking-wider text-primary-container dark:text-on-primary-container-d">
                Community balance
              </Text>
            </View>
            <Text className="mt-2 text-[34px] font-bold leading-10 text-on-primary tabular-nums dark:text-on-primary-container-d">
              {isLoading ? '…' : inr(stats?.currentBalance ?? 0)}
            </Text>
            <View className="mt-5 flex-row gap-2">
              <HeroChip
                icon="arrow-down-circle-outline"
                label="Collected"
                value={inr(stats?.monthlyCollection ?? 0)}
              />
              <HeroChip
                icon="arrow-up-circle-outline"
                label="Spent"
                value={inr(stats?.monthlyExpenses ?? 0)}
              />
              <HeroChip
                icon="account-group-outline"
                label="Paid"
                value={`${stats?.paidMembersThisMonth ?? 0}/${stats?.activeMembers ?? 0}`}
              />
            </View>
          </View>
        </View>

        {/* My dues */}
        {dues.length > 0 && (
          <>
            <SectionTitle>My dues</SectionTitle>
            {dues.map((p) => (
              <DueCard key={p.id} payment={p} />
            ))}
          </>
        )}

        {/* Community overview — uniform brand-tint grid */}
        <SectionTitle>Community overview</SectionTitle>
        <View className="flex-row gap-3">
          <StatCard
            tone="primary"
            icon="cash-clock"
            label="Pending collection"
            value={inr(stats?.pendingCollection ?? 0)}
          />
          <StatCard
            tone="primary"
            icon="account-group"
            label="Active members"
            value={String(stats?.activeMembers ?? 0)}
            sub={`${stats?.totalMembers ?? 0} total`}
          />
        </View>
        <View className="mt-3 flex-row gap-3">
          <StatCard
            tone="primary"
            icon={monthUp ? 'trending-up' : 'trending-down'}
            label="This month vs last"
            value={`${monthUp ? '+' : ''}${stats?.monthlyComparison.changePercent ?? 0}%`}
          />
          <StatCard
            tone="primary"
            icon="alert-circle-outline"
            label="Failed payments"
            value={String(stats?.failedPaymentsThisMonth ?? 0)}
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
                    <MaterialCommunityIcons name="calendar-star" size={22} color="#984447" />
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

/** A pending due with a one-time "Pay now" button (works with AutoPay). */
function DueCard({ payment }: { payment: PaymentDto }) {
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);

  async function pay() {
    setPaying(true);
    try {
      await payPendingPayment(payment.id, qc);
    } finally {
      setPaying(false);
    }
  }

  return (
    <View className="mb-2 rounded-m3-lg bg-primary-container p-4 dark:bg-primary-container-d">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-sm font-semibold text-on-primary-container dark:text-on-primary-container-d">
            {payment.type === 'SUBSCRIPTION'
              ? `Subscription · ${periodLabel(payment.period)}`
              : (payment.eventName ?? payment.type.toLowerCase())}
          </Text>
          <Text className="mt-0.5 text-xs text-on-primary-container/80 dark:text-on-primary-container-d/80">
            Pay online now, or by cash/UPI to your admin
          </Text>
        </View>
        <View className="items-end gap-1">
          <Text className="text-base font-bold text-on-primary-container tabular-nums dark:text-on-primary-container-d">
            {inr(payment.amount)}
          </Text>
          <StatusBadge status={payment.status} />
        </View>
      </View>
      <Pressable
        onPress={() => void pay()}
        disabled={paying}
        className="mt-3 h-11 flex-row items-center justify-center gap-2 rounded-m3-md bg-primary active:opacity-80 dark:bg-primary-d"
      >
        {paying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons name="cash-fast" size={16} color="#fff" />
            <Text className="text-sm font-semibold text-on-primary dark:text-on-primary-container">
              Pay {inr(payment.amount)} now
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

/** Translucent info chip inside the hero card. */
function HeroChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-m3-md bg-white/15 px-3 py-2.5">
      <View className="flex-row items-center gap-1">
        <MaterialCommunityIcons name={icon} size={13} color="#FFDAD9" />
        <Text className="text-[11px] text-primary-container dark:text-on-primary-container-d">
          {label}
        </Text>
      </View>
      <Text
        className="mt-0.5 text-sm font-semibold text-on-primary tabular-nums dark:text-on-primary-container-d"
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
