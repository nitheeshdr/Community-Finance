import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, type Href } from 'expo-router';
import { Menu } from 'react-native-paper';
import {
  EventFundingMode,
  EventStatus,
  PaymentStatus,
  UserRole,
} from '@community-finance/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useChangeEventStatus, useDeleteEvent } from '@/lib/admin';
import { apiErrorMessage } from '@/lib/api';
import { formatDate, inr } from '@/lib/format';
import { payEventShare } from '@/lib/pay';
import { useEvent, useEventSplits } from '@/lib/queries';
import { Card, Row, SectionTitle, StatusBadge } from '@/components/ui';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: event, isLoading } = useEvent(id);
  const { data: splits } = useEventSplits(id);
  const [paying, setPaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const changeStatus = useChangeEventStatus(id);
  const deleteEvent = useDeleteEvent();

  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const mySplit = splits?.find((s) => s.memberId === user?.id);
  const paidCount = splits?.filter((s) => s.status === PaymentStatus.PAID).length ?? 0;
  const remaining = mySplit ? mySplit.splitAmount - mySplit.paidAmount : 0;
  const isOpen = event?.status === EventStatus.ACTIVE || event?.status === EventStatus.DRAFT;

  async function payNow() {
    setPaying(true);
    try {
      await payEventShare(id, qc);
    } finally {
      setPaying(false);
    }
  }

  function onEdit() {
    setMenuOpen(false);
    router.push(`/admin/create-event?id=${id}` as Href);
  }

  function onStatus(status: EventStatus, label: string) {
    setMenuOpen(false);
    Alert.alert(`${label} event?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: status === EventStatus.CANCELLED ? 'destructive' : 'default',
        onPress: () =>
          changeStatus.mutate(status, {
            onError: (err) => Alert.alert('Failed', apiErrorMessage(err)),
          }),
      },
    ]);
  }

  function onDelete() {
    setMenuOpen(false);
    Alert.alert(
      'Delete event?',
      'Only possible if no expenses or collections exist — otherwise cancel it instead.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteEvent.mutate(id, {
              onSuccess: () => router.back(),
              onError: (err) => Alert.alert('Cannot delete', apiErrorMessage(err)),
            }),
        },
      ]
    );
  }

  if (isLoading || !event) {
    return (
      <View className="flex-1 items-center justify-center bg-surface dark:bg-surface-d">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: event.name,
          headerRight: isAdmin
            ? () => (
                <Menu
                  visible={menuOpen}
                  onDismiss={() => setMenuOpen(false)}
                  anchor={
                    <Pressable onPress={() => setMenuOpen(true)} hitSlop={8}>
                      <MaterialCommunityIcons name="dots-vertical" size={22} color="#1B1B21" />
                    </Pressable>
                  }
                >
                  {isOpen && <Menu.Item leadingIcon="pencil-outline" onPress={onEdit} title="Edit" />}
                  {isOpen && (
                    <Menu.Item
                      leadingIcon="lock-outline"
                      onPress={() => onStatus(EventStatus.CLOSED, 'Close')}
                      title="Close"
                    />
                  )}
                  {event.status === EventStatus.ACTIVE && (
                    <Menu.Item
                      leadingIcon="close-circle-outline"
                      onPress={() => onStatus(EventStatus.CANCELLED, 'Cancel')}
                      title="Cancel"
                    />
                  )}
                  {isSuperAdmin && (
                    <Menu.Item leadingIcon="trash-can-outline" onPress={onDelete} title="Delete" />
                  )}
                </Menu>
              )
            : undefined,
        }}
      />
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
                  {remaining > 0 ? ` · ${inr(remaining)} remaining` : ''}
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

            {/* Pay now — only when the member still owes something */}
            {remaining > 0 && (
              <Pressable
                onPress={() => void payNow()}
                disabled={paying}
                className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-m3-md bg-primary active:opacity-80 dark:bg-primary-d"
              >
                {paying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="cash-fast" size={18} color="#fff" />
                    <Text className="text-base font-semibold text-on-primary dark:text-on-primary-container">
                      Pay {inr(remaining)} now
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </Card>
        )}
        {/* Balance-funded events: nothing to pay */}
        {event.fundingMode === EventFundingMode.BALANCE && (
          <Card className="mb-4 flex-row items-center gap-3">
            <MaterialCommunityIcons name="wallet-outline" size={22} color="#4F46E5" />
            <Text className="flex-1 text-sm text-on-surface-variant dark:text-on-surface-variant-d">
              This event is funded from the community balance. No member contribution is needed.
            </Text>
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
