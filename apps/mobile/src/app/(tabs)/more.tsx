import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationType, type NotificationDto } from '@community-finance/shared';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDateTime, initials } from '@/lib/format';
import { useNotifications } from '@/lib/queries';
import { Card, EmptyState, SectionTitle } from '@/components/ui';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useNotifications(1);
  const notifications = data?.data ?? [];
  const [changingPassword, setChangingPassword] = useState(false);

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const logoutEverywhere = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout-all');
    },
    onSuccess: () => void logout(),
  });

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <ScrollView
        contentContainerClassName="px-4 pb-10"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        {/* Profile */}
        <View className="mb-2 mt-2 flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
            <Text className="text-lg font-bold text-white">
              {user ? initials(user.name) : '…'}
            </Text>
          </View>
          <View>
            <Text className="text-lg font-bold text-gray-900 dark:text-white">{user?.name}</Text>
            <Text className="text-sm text-muted">
              {user?.phone} · {user?.role.replace('_', ' ').toLowerCase()}
            </Text>
          </View>
        </View>

        {/* Notifications */}
        <SectionTitle
          right={
            notifications.some((n) => !n.read) ? (
              <Pressable onPress={() => markAllRead.mutate()}>
                <Text className="text-sm font-medium text-primary dark:text-primary-dark">
                  Mark all read
                </Text>
              </Pressable>
            ) : undefined
          }
        >
          Notifications
        </SectionTitle>
        <Card>
          {isLoading ? (
            <ActivityIndicator className="py-6" />
          ) : notifications.length === 0 ? (
            <EmptyState
              icon="bell-outline"
              title="No notifications"
              description="Payment updates and announcements will appear here."
            />
          ) : (
            notifications.slice(0, 15).map((n, i) => (
              <NotificationRow key={n.id} notification={n} first={i === 0} />
            ))
          )}
        </Card>

        {/* Account */}
        <SectionTitle>Account</SectionTitle>
        <Card>
          <ActionRow
            icon="key-outline"
            label="Change password"
            onPress={() => setChangingPassword((v) => !v)}
          />
          {changingPassword && <ChangePasswordForm onDone={() => setChangingPassword(false)} />}
          <ActionRow
            icon="cellphone-off"
            label="Sign out everywhere"
            destructive
            onPress={() =>
              Alert.alert(
                'Sign out everywhere?',
                'This logs you out of all devices, including this one.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign out everywhere',
                    style: 'destructive',
                    onPress: () => logoutEverywhere.mutate(),
                  },
                ]
              )
            }
          />
          <ActionRow
            icon="logout"
            label="Sign out"
            destructive
            onPress={() => void logout()}
          />
        </Card>

        <Text className="mt-6 text-center text-xs text-muted">
          Community Finance · transparent by design
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationRow({
  notification,
  first,
}: {
  notification: NotificationDto;
  first: boolean;
}) {
  const icon =
    notification.type === NotificationType.PAYMENT_SUCCESS
      ? 'check-circle-outline'
      : notification.type === NotificationType.PAYMENT_FAILED
        ? 'alert-circle-outline'
        : notification.type === NotificationType.PAYMENT_REMINDER
          ? 'clock-outline'
          : notification.type === NotificationType.EMERGENCY
            ? 'alert-octagon-outline'
            : 'bell-outline';

  return (
    <View
      className={`flex-row gap-3 py-3 ${!first ? 'border-t border-border dark:border-border-dark' : ''}`}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={notification.read ? '#9ca3af' : '#4f46e5'}
        style={{ marginTop: 2 }}
      />
      <View className="flex-1">
        <Text
          className={`text-sm ${notification.read ? 'text-gray-600 dark:text-gray-400' : 'font-semibold text-gray-900 dark:text-white'}`}
        >
          {notification.title}
        </Text>
        <Text className="mt-0.5 text-xs text-muted" numberOfLines={2}>
          {notification.body}
        </Text>
        <Text className="mt-1 text-[11px] text-muted">
          {formatDateTime(notification.createdAt)}
        </Text>
      </View>
      {!notification.read && <View className="mt-2 h-2 w-2 rounded-full bg-primary" />}
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-border py-3.5 last:border-b-0 active:opacity-60 dark:border-border-dark"
    >
      <MaterialCommunityIcons name={icon} size={20} color={destructive ? '#dc2626' : '#6b7280'} />
      <Text
        className={`flex-1 text-sm font-medium ${destructive ? 'text-destructive' : 'text-gray-900 dark:text-white'}`}
      >
        {label}
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
    </Pressable>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const { logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/change-password', {
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      });
    },
    onSuccess: () => {
      Alert.alert('Password changed', 'Please sign in again with your new password.', [
        { text: 'OK', onPress: () => void logout() },
      ]);
      onDone();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const inputClass =
    'mb-2 h-11 rounded-xl border border-border bg-background px-3 text-sm text-gray-900 dark:border-border-dark dark:bg-background-dark dark:text-white';

  return (
    <View className="border-b border-border pb-4 pt-1 dark:border-border-dark">
      <TextInput
        className={inputClass}
        placeholder="Current password"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        value={current}
        onChangeText={setCurrent}
      />
      <TextInput
        className={inputClass}
        placeholder="New password (min 8, letter + number)"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        value={next}
        onChangeText={setNext}
      />
      <TextInput
        className={inputClass}
        placeholder="Confirm new password"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />
      {error && <Text className="mb-2 text-xs text-destructive">{error}</Text>}
      <Pressable
        className="h-11 items-center justify-center rounded-xl bg-primary active:opacity-80"
        disabled={mutation.isPending || !current || !next || next !== confirm}
        onPress={() => mutation.mutate()}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text className="text-sm font-semibold text-white">Change password</Text>
        )}
      </Pressable>
    </View>
  );
}
