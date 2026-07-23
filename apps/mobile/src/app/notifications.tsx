import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationType, type NotificationDto } from '@community-finance/shared';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useNotifications } from '@/lib/queries';
import { EmptyState } from '@/components/ui';

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch, isRefetching } = useNotifications(page);
  const notifications = data?.data ?? [];
  const meta = data?.meta;
  const hasUnread = notifications.some((n) => !n.read);

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerRight: () =>
            hasUnread ? (
              <Pressable onPress={() => markAllRead.mutate()} hitSlop={8}>
                <Text className="text-sm font-semibold text-primary dark:text-primary-d">
                  Mark all read
                </Text>
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        className="flex-1 bg-surface dark:bg-surface-d"
        contentContainerClassName="px-4 py-3 pb-10"
        data={notifications}
        keyExtractor={(n) => n.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator className="py-16" />
          ) : (
            <EmptyState
              icon="bell-outline"
              title="No notifications"
              description="Payment updates, event news, and announcements will appear here."
            />
          )
        }
        renderItem={({ item }) => <NotificationRow notification={item} />}
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
    </>
  );
}

const TYPE_META: Partial<
  Record<
    NotificationType,
    { icon: keyof typeof MaterialCommunityIcons.glyphMap; bg: string; color: string }
  >
> = {
  [NotificationType.PAYMENT_SUCCESS]: {
    icon: 'check-circle-outline',
    bg: 'bg-success-container dark:bg-success-container-d',
    color: '#146C2E',
  },
  [NotificationType.PAYMENT_FAILED]: {
    icon: 'alert-circle-outline',
    bg: 'bg-error-container dark:bg-error-container-d',
    color: '#BA1A1A',
  },
  [NotificationType.PAYMENT_REMINDER]: {
    icon: 'clock-outline',
    bg: 'bg-warning-container dark:bg-warning-container-d',
    color: '#785900',
  },
  [NotificationType.EMERGENCY]: {
    icon: 'alert-octagon-outline',
    bg: 'bg-error-container dark:bg-error-container-d',
    color: '#BA1A1A',
  },
  [NotificationType.BUDGET_UPDATED]: {
    icon: 'chart-donut',
    bg: 'bg-primary-container dark:bg-primary-container-d',
    color: '#4F46E5',
  },
  [NotificationType.EVENT_CREATED]: {
    icon: 'calendar-star',
    bg: 'bg-primary-container dark:bg-primary-container-d',
    color: '#4F46E5',
  },
};

function NotificationRow({ notification }: { notification: NotificationDto }) {
  const qc = useQueryClient();
  const markMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/notifications/${notification.id}/read`);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const meta = TYPE_META[notification.type] ?? {
    icon: 'bell-outline' as const,
    bg: 'bg-secondary-container dark:bg-secondary-container-d',
    color: '#5D5C72',
  };

  return (
    <Pressable
      onPress={() => !notification.read && markMutation.mutate()}
      className={`mb-2 flex-row gap-3 rounded-m3-lg p-3.5 ${
        notification.read
          ? 'bg-surface-low dark:bg-surface-low-d'
          : 'bg-surface-container dark:bg-surface-container-d'
      }`}
    >
      <View className={`h-10 w-10 items-center justify-center rounded-full ${meta.bg}`}>
        <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm ${
            notification.read
              ? 'text-on-surface-variant dark:text-on-surface-variant-d'
              : 'font-semibold text-on-surface dark:text-on-surface-d'
          }`}
        >
          {notification.title}
        </Text>
        <Text
          className="mt-0.5 text-xs text-on-surface-variant dark:text-on-surface-variant-d"
          numberOfLines={2}
        >
          {notification.body}
        </Text>
        <Text className="mt-1 text-[11px] text-on-surface-variant dark:text-on-surface-variant-d">
          {formatDateTime(notification.createdAt)}
        </Text>
      </View>
      {!notification.read && (
        <View className="mt-2 h-2 w-2 rounded-full bg-primary dark:bg-primary-d" />
      )}
    </Pressable>
  );
}
