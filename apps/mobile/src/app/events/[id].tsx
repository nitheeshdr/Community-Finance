import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { PaymentStatus } from '@community-finance/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { formatDate, inr } from '@/lib/format';
import { useEvent, useEventSplits } from '@/lib/queries';
import { Card, Row, SectionTitle, StatusBadge } from '@/components/ui';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const { data: splits } = useEventSplits(id);

  const mySplit = splits?.find((s) => s.memberId === user?.id);
  const paidCount = splits?.filter((s) => s.status === PaymentStatus.PAID).length ?? 0;

  if (isLoading || !event) {
    return (
      <View className="flex-1 items-center justify-center bg-surface dark:bg-surface-d">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: event.name }} />
      <ScrollView
        className="flex-1 bg-surface dark:bg-surface-d"
        contentContainerClassName="p-4 pb-10"
      >
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-xl font-bold text-on-surface dark:text-on-surface-d">{event.name}</Text>
            <Text className="mt-0.5 text-sm text-on-surface-variant dark:text-on-surface-variant-d">{formatDate(event.date)}</Text>
          </View>
          <StatusBadge status={event.status} />
        </View>

        {event.description ? (
          <Text className="mb-4 text-sm leading-5 text-on-surface-variant dark:text-on-surface-variant-d">
            {event.description}
          </Text>
        ) : null}

        {/* My share highlight */}
        {mySplit && (
          <Card className="mb-4 border border-outline-variant dark:border-outline-variant-d">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-medium uppercase tracking-wide text-on-surface-variant dark:text-on-surface-variant-d">
                  Your contribution
                </Text>
                <Text className="mt-1 text-2xl font-bold text-on-surface tabular-nums dark:text-on-surface-d">
                  {inr(mySplit.splitAmount)}
                </Text>
                <Text className="mt-0.5 text-xs text-on-surface-variant dark:text-on-surface-variant-d">
                  Paid {inr(mySplit.paidAmount)}
                  {mySplit.paidAmount < mySplit.splitAmount
                    ? ` · ${inr(mySplit.splitAmount - mySplit.paidAmount)} remaining`
                    : ''}
                </Text>
              </View>
              {mySplit.status === PaymentStatus.PAID ? (
                <View className="items-center">
                  <MaterialCommunityIcons name="check-circle" size={34} color="#16a34a" />
                  <Text className="mt-1 text-xs font-semibold text-success dark:text-success-d">Paid</Text>
                </View>
              ) : (
                <StatusBadge status={mySplit.status} />
              )}
            </View>
          </Card>
        )}

        {/* Budget summary */}
        <Card>
          <Row label="Budget" value={inr(event.budget)} />
          <Row label="Per member" value={inr(event.perHeadAmount)} />
          <Row label="Collected" value={inr(event.collectedAmount)} accent="text-success" />
          <Row label="Spent" value={inr(event.spentAmount)} />
          <Row
            label="Remaining budget"
            value={inr(event.budget - event.spentAmount)}
            accent={event.budget - event.spentAmount < 0 ? 'text-error dark:text-error-d' : undefined}
          />
        </Card>

        {/* Member contributions (transparency) */}
        <SectionTitle>
          Contributions ({paidCount}/{splits?.length ?? 0} paid)
        </SectionTitle>
        <Card>
          {(splits ?? []).map((s, i) => (
            <View
              key={s.id}
              className={`flex-row items-center justify-between py-2.5 ${
                i > 0 ? 'border-t border-outline-variant dark:border-outline-variant-d' : ''
              }`}
            >
              <Text
                className={`flex-1 text-sm ${
                  s.memberId === user?.id
                    ? 'font-bold text-primary dark:text-primary-d'
                    : 'text-on-surface dark:text-on-surface-d'
                }`}
                numberOfLines={1}
              >
                {s.memberName}
                {s.memberId === user?.id ? ' (you)' : ''}
              </Text>
              <Text className="mr-3 text-sm text-on-surface-variant dark:text-on-surface-variant-d tabular-nums">
                {inr(s.paidAmount)}/{inr(s.splitAmount)}
              </Text>
              <StatusBadge status={s.status} />
            </View>
          ))}
          {!splits?.length && (
            <Text className="py-4 text-center text-sm text-on-surface-variant dark:text-on-surface-variant-d">No splits yet.</Text>
          )}
        </Card>
      </ScrollView>
    </>
  );
}
