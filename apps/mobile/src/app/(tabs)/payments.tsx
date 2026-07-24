import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SubscriptionStatus,
  type ApiSuccess,
  type PaymentDto,
  type SubscriptionDto,
} from '@community-finance/shared';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDate, inr, periodLabel } from '@/lib/format';
import { payPendingPayment } from '@/lib/pay';
import { useMyPayments, useMySubscription } from '@/lib/queries';
import { Card, EmptyState, StatusBadge } from '@/components/ui';

export default function PaymentsScreen() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch, isRefetching } = useMyPayments(user?.id, page);
  const payments = data?.data ?? [];
  const meta = data?.meta;

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-d" edges={['top']}>
      <FlatList
        data={payments}
        keyExtractor={(p) => p.id}
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        ListHeaderComponent={
          <>
            <Text className="mb-1 mt-2 text-xl font-bold text-on-surface dark:text-on-surface-d">
              Payments
            </Text>
            <Text className="mb-4 text-sm text-on-surface-variant dark:text-on-surface-variant-d">
              Your subscription and contribution history
            </Text>
            <AutoPayCard />
            <Text className="mb-2 mt-6 text-base font-semibold text-on-surface dark:text-on-surface-d">
              History
            </Text>
            {isLoading && <ActivityIndicator className="py-10" />}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <Card>
              <EmptyState
                icon="credit-card-outline"
                title="No payments yet"
                description="Your receipts will appear here once payments are recorded."
              />
            </Card>
          ) : null
        }
        renderItem={({ item }) => <PaymentRow payment={item} />}
        ListFooterComponent={
          meta && meta.totalPages > 1 ? (
            <View className="mt-3 flex-row items-center justify-center gap-4">
              <Pressable
                disabled={page <= 1}
                onPress={() => setPage((p) => p - 1)}
                className={`rounded-m3-sm border border-outline-variant px-3 py-1.5 dark:border-outline-variant-d ${page <= 1 ? 'opacity-40' : ''}`}
              >
                <Text className="text-sm text-on-surface dark:text-on-surface-d">Previous</Text>
              </Pressable>
              <Text className="text-xs text-on-surface-variant dark:text-on-surface-variant-d">
                {meta.page} / {meta.totalPages}
              </Text>
              <Pressable
                disabled={page >= meta.totalPages}
                onPress={() => setPage((p) => p + 1)}
                className={`rounded-m3-sm border border-outline-variant px-3 py-1.5 dark:border-outline-variant-d ${page >= meta.totalPages ? 'opacity-40' : ''}`}
              >
                <Text className="text-sm text-on-surface dark:text-on-surface-d">Next</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function PaymentRow({ payment }: { payment: PaymentDto }) {
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const payable =
    payment.status === 'PENDING' ||
    payment.status === 'OVERDUE' ||
    payment.status === 'FAILED';

  async function openReceipt() {
    if (payment.receiptUrl) {
      await WebBrowser.openBrowserAsync(payment.receiptUrl);
    }
  }

  async function pay() {
    setPaying(true);
    try {
      await payPendingPayment(payment.id, qc);
    } finally {
      setPaying(false);
    }
  }

  return (
    <Card className="mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-semibold text-on-surface dark:text-on-surface-d">
            {payment.type === 'SUBSCRIPTION'
              ? `Subscription · ${periodLabel(payment.period)}`
              : (payment.eventName ?? payment.type.replace(/_/g, ' ').toLowerCase())}
          </Text>
          <Text className="mt-0.5 text-xs text-on-surface-variant dark:text-on-surface-variant-d">
            {formatDate(payment.paidAt ?? payment.createdAt)} ·{' '}
            {payment.method.toLowerCase()}
          </Text>
        </View>
        <View className="items-end gap-1">
          <Text className="text-base font-bold text-on-surface tabular-nums dark:text-on-surface-d">
            {inr(payment.amount)}
          </Text>
          <StatusBadge status={payment.status} />
        </View>
      </View>

      {payable && (
        <Pressable
          onPress={() => void pay()}
          disabled={paying}
          className="mt-3 h-10 flex-row items-center justify-center gap-2 rounded-m3-md bg-primary active:opacity-80 dark:bg-primary-d"
        >
          {paying ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="cash-fast" size={15} color="#fff" />
              <Text className="text-sm font-semibold text-on-primary dark:text-on-primary-container">
                Pay {inr(payment.amount)} now
              </Text>
            </>
          )}
        </Pressable>
      )}

      {payment.receiptNumber && (
        <Pressable
          onPress={() => void openReceipt()}
          className="mt-3 flex-row items-center gap-1.5 self-start rounded-m3-sm bg-primary-container px-2.5 py-1.5 active:opacity-70 dark:bg-primary-container-d"
        >
          <MaterialCommunityIcons name="file-download-outline" size={14} color="#984447" />
          <Text className="text-xs font-semibold text-primary dark:text-primary-d">
            Receipt {payment.receiptNumber}
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

/** Razorpay AutoPay: create/see the subscription and open the UPI mandate link. */
function AutoPayCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: subscription, isLoading } = useMySubscription(user?.id);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiSuccess<SubscriptionDto>>('/subscriptions', {
        memberId: user?.id,
      });
      return res.data.data;
    },
    onSuccess: async (sub) => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['subscription'] });
      if (sub.shortUrl) await WebBrowser.openBrowserAsync(sub.shortUrl);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const live =
    subscription &&
    [SubscriptionStatus.ACTIVE, SubscriptionStatus.AUTHENTICATED].includes(
      subscription.status
    );

  return (
    <Card>
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-m3-md bg-primary-container dark:bg-primary-container-d">
          <MaterialCommunityIcons name="autorenew" size={22} color="#984447" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-on-surface dark:text-on-surface-d">
            AutoPay subscription
          </Text>
          <Text className="mt-0.5 text-xs text-on-surface-variant dark:text-on-surface-variant-d">
            {isLoading
              ? 'Checking…'
              : live
                ? `Active — next charge ${formatDate(subscription?.nextChargeAt)}. You can still pay a due manually above.`
                : subscription
                  ? `Status: ${subscription.status.toLowerCase()}`
                  : 'Auto-charge your monthly fee via UPI, or pay each due manually above'}
          </Text>
        </View>
        {live ? (
          <StatusBadge status="ACTIVE" />
        ) : subscription?.shortUrl ? (
          <Pressable
            className="rounded-m3-sm bg-primary px-3 py-2 active:opacity-80"
            onPress={() => void WebBrowser.openBrowserAsync(subscription.shortUrl!)}
          >
            <Text className="text-xs font-semibold text-white">Authorize</Text>
          </Pressable>
        ) : (
          <Pressable
            className="rounded-m3-sm bg-primary px-3 py-2 active:opacity-80"
            disabled={createMutation.isPending}
            onPress={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-xs font-semibold text-white">Set up</Text>
            )}
          </Pressable>
        )}
      </View>
      {error && <Text className="mt-2 text-xs text-error dark:text-error-d">{error}</Text>}
    </Card>
  );
}
