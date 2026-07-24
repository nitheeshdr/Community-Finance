import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemberLedger } from '@/lib/admin';
import { formatDate, inr } from '@/lib/format';
import { Card, EmptyState, StatusBadge } from '@/components/ui';

function label(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(
    new Date(y!, m! - 1, 1)
  );
}

export default function LedgerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: ledger, isLoading } = useMemberLedger(id);

  if (isLoading || !ledger) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: ledger.name || 'Ledger' }} />
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4 pb-10">
        <Text className="text-lg font-bold text-on-surface">{ledger.name}</Text>
        <Text className="mb-3 text-sm text-on-surface-variant">
          {ledger.phone} · member since {formatDate(ledger.memberSince)}
        </Text>

        {/* Summary */}
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 items-center rounded-m3-md bg-success-container py-2.5">
            <Text className="text-lg font-bold text-on-success-container tabular-nums">
              {ledger.paidMonths}
            </Text>
            <Text className="text-xs text-on-success-container">Paid months</Text>
          </View>
          <View className="flex-1 items-center rounded-m3-md bg-error-container py-2.5">
            <Text className="text-lg font-bold text-on-error-container tabular-nums">
              {ledger.unpaidMonths}
            </Text>
            <Text className="text-xs text-on-error-container">Unpaid months</Text>
          </View>
          <View className="flex-1 items-center rounded-m3-md bg-surface-container py-2.5">
            <Text className="text-sm font-bold text-on-surface tabular-nums">
              {inr(ledger.totalPaid)}
            </Text>
            <Text className="text-xs text-on-surface-variant">Total paid</Text>
          </View>
        </View>

        {ledger.entries.length === 0 ? (
          <EmptyState icon="calendar-blank-outline" title="No subscription history" />
        ) : (
          <Card>
            {ledger.entries.map((e, i) => (
              <View
                key={e.period}
                className={`flex-row items-center justify-between py-2.5 ${i > 0 ? 'border-t border-outline-variant' : ''}`}
              >
                <View className="flex-row items-center gap-2.5">
                  <MaterialCommunityIcons
                    name={e.status === 'PAID' ? 'check-circle' : 'circle-outline'}
                    size={18}
                    color={e.status === 'PAID' ? '#146C2E' : '#BA1A1A'}
                  />
                  <View>
                    <Text className="text-sm font-medium text-on-surface">{label(e.period)}</Text>
                    {e.status === 'PAID' && e.paidAt ? (
                      <Text className="text-xs text-on-surface-variant">
                        {formatDate(e.paidAt)} · {e.method?.toLowerCase()}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm text-on-surface-variant tabular-nums">{inr(e.amount)}</Text>
                  <StatusBadge status={e.status} />
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </>
  );
}
