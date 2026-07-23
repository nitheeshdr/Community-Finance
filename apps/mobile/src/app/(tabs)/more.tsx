import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
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
import { loadThemePref, setThemePref, type ThemePref } from '@/lib/theme-pref';
import { Card, EmptyState, SectionTitle } from '@/components/ui';

const THEME_OPTIONS: Array<{
  value: ThemePref;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
  { value: 'dark', label: 'Dark', icon: 'weather-night' },
  { value: 'system', label: 'System', icon: 'theme-light-dark' },
];

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useNotifications(1);
  const notifications = data?.data ?? [];
  const [changingPassword, setChangingPassword] = useState(false);
  const [themePref, setThemePrefState] = useState<ThemePref | null>(null);
  const dark = useColorScheme() === 'dark';

  useEffect(() => {
    void loadThemePref().then(setThemePrefState);
  }, []);

  async function chooseTheme(pref: ThemePref) {
    setThemePrefState(pref);
    await setThemePref(pref);
  }

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
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-d" edges={['top']}>
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
            <Text className="text-lg font-bold text-on-surface dark:text-on-surface-d">{user?.name}</Text>
            <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-d">
              {user?.phone} · {user?.role.replace('_', ' ').toLowerCase()}
            </Text>
          </View>
        </View>

        {/* Notifications */}
        <SectionTitle
          right={
            notifications.some((n) => !n.read) ? (
              <Pressable onPress={() => markAllRead.mutate()}>
                <Text className="text-sm font-medium text-primary dark:text-primary-d">
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

        {/* Appearance — M3 segmented control */}
        <SectionTitle>Appearance</SectionTitle>
        <Card>
          <View className="flex-row overflow-hidden rounded-m3-xl border border-outline-variant dark:border-outline-variant-d">
            {THEME_OPTIONS.map((opt, i) => {
              const selected = (themePref ?? 'system') === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => void chooseTheme(opt.value)}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 ${
                    i > 0 ? 'border-l border-outline-variant dark:border-outline-variant-d' : ''
                  } ${selected ? 'bg-secondary-container dark:bg-secondary-container-d' : ''}`}
                >
                  <MaterialCommunityIcons
                    name={selected ? 'check' : opt.icon}
                    size={16}
                    color={dark ? '#E2E0F9' : '#1A1A2C'}
                  />
                  <Text
                    className={`text-sm ${
                      selected
                        ? 'font-semibold text-on-secondary-container dark:text-on-secondary-container-d'
                        : 'text-on-surface dark:text-on-surface-d'
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-2 text-xs text-on-surface-variant dark:text-on-surface-variant-d">
            Light forces the bright theme everywhere; System follows your phone setting.
          </Text>
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

        <Text className="mt-6 text-center text-xs text-on-surface-variant dark:text-on-surface-variant-d">
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
      className={`flex-row gap-3 py-3 ${!first ? 'border-t border-outline-variant dark:border-outline-variant-d' : ''}`}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={notification.read ? '#9ca3af' : '#4f46e5'}
        style={{ marginTop: 2 }}
      />
      <View className="flex-1">
        <Text
          className={`text-sm ${notification.read ? 'text-on-surface-variant dark:text-on-surface-variant-d' : 'font-semibold text-on-surface dark:text-on-surface-d'}`}
        >
          {notification.title}
        </Text>
        <Text className="mt-0.5 text-xs text-on-surface-variant dark:text-on-surface-variant-d" numberOfLines={2}>
          {notification.body}
        </Text>
        <Text className="mt-1 text-[11px] text-on-surface-variant dark:text-on-surface-variant-d">
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
      className="flex-row items-center gap-3 border-b border-outline-variant py-3.5 last:border-b-0 active:opacity-60 dark:border-outline-variant-d"
    >
      <MaterialCommunityIcons name={icon} size={20} color={destructive ? '#dc2626' : '#6b7280'} />
      <Text
        className={`flex-1 text-sm font-medium ${destructive ? 'text-error dark:text-error-d' : 'text-on-surface dark:text-on-surface-d'}`}
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
    'mb-2 h-11 rounded-m3-md border border-outline-variant bg-surface-lowest px-3 text-sm text-on-surface dark:border-outline-variant-d dark:bg-surface-lowest-d dark:text-on-surface-d';

  return (
    <View className="border-b border-outline-variant pb-4 pt-1 dark:border-outline-variant-d">
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
      {error && <Text className="mb-2 text-xs text-error dark:text-error-d">{error}</Text>}
      <Pressable
        className="h-11 items-center justify-center rounded-m3-md bg-primary active:opacity-80"
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
