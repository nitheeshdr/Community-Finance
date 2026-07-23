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
import { useMyPayments, useMySubscription } from '@/lib/queries';
import { Card, EmptyState, StatusBadge } from '@/components/ui';

export default function PaymentsScreen() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch, isRefetching } = useMyPayments(user?.id, page);
  const payments = data?.data ?? [];
  const meta = data?.meta;

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <FlatList
        data={payments}
        keyExtractor={(p) => p.id}
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        ListHeaderComponent={
          <>
            <Text className="mb-1 mt-2 text-xl font-bold text-gray-900 dark:text-white">
              Payments
            </Text>
            <Text className="mb-4 text-sm text-muted">
              Your subscription and contribution history
            </Text>
            <AutoPayCard />
            <Text className="mb-2 mt-6 text-base font-semibold text-gray-900 dark:text-white">
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
                className={`rounded-lg border border-border px-3 py-1.5 dark:border-border-dark ${page <= 1 ? 'opacity-40' : ''}`}
              >
                <Text className="text-sm text-gray-900 dark:text-white">Previous</Text>
              </Pressable>
              <Text className="text-xs text-muted">
                {meta.page} / {meta.totalPages}
              </Text>
              <Pressable
                disabled={page >= meta.totalPages}
                onPress={() => setPage((p) => p + 1)}
                className={`rounded-lg border border-border px-3 py-1.5 dark:border-border-dark ${page >= meta.totalPages ? 'opacity-40' : ''}`}
              >
                <Text className="text-sm text-gray-900 dark:text-white">Next</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function PaymentRow({ payment }: { payment: PaymentDto }) {
  async function openReceipt() {
    if (payment.receiptUrl) {
      await WebBrowser.openBrowserAsync(payment.receiptUrl);
    }
  }

  return (
    <Card className="mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-semibold text-gray-900 dark:text-white">
            {payment.type === 'SUBSCRIPTION'
              ? `Subscription · ${periodLabel(payment.period)}`
              : (payment.eventName ?? payment.type.replace(/_/g, ' ').toLowerCase())}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">
            {formatDate(payment.paidAt ?? payment.createdAt)} ·{' '}
            {payment.method.toLowerCase()}
          </Text>
        </View>
        <View className="items-end gap-1">
          <Text className="text-base font-bold text-gray-900 tabular-nums dark:text-white">
            {inr(payment.amount)}
          </Text>
          <StatusBadge status={payment.status} />
        </View>
      </View>
      {payment.receiptNumber && (
        <Pressable
          onPress={() => void openReceipt()}
          className="mt-3 flex-row items-center gap-1.5 self-start rounded-lg bg-indigo-50 px-2.5 py-1.5 active:opacity-70 dark:bg-indigo-950"
        >
          <MaterialCommunityIcons name="file-download-outline" size={14} color="#4f46e5" />
          <Text className="text-xs font-semibold text-primary dark:text-primary-dark">
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
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950">
          <MaterialCommunityIcons name="autorenew" size={22} color="#4f46e5" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900 dark:text-white">
            AutoPay subscription
          </Text>
          <Text className="mt-0.5 text-xs text-muted">
            {isLoading
              ? 'Checking…'
              : live
                ? `Active — next charge ${formatDate(subscription?.nextChargeAt)}`
                : subscription
                  ? `Status: ${subscription.status.toLowerCase()}`
                  : 'Pay your monthly fee automatically via UPI'}
          </Text>
        </View>
        {live ? (
          <StatusBadge status="ACTIVE" />
        ) : subscription?.shortUrl ? (
          <Pressable
            className="rounded-lg bg-primary px-3 py-2 active:opacity-80"
            onPress={() => void WebBrowser.openBrowserAsync(subscription.shortUrl!)}
          >
            <Text className="text-xs font-semibold text-white">Authorize</Text>
          </Pressable>
        ) : (
          <Pressable
            className="rounded-lg bg-primary px-3 py-2 active:opacity-80"
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
      {error && <Text className="mt-2 text-xs text-destructive">{error}</Text>}
    </Card>
  );
}
