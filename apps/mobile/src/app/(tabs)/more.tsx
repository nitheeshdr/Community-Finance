import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { initials } from '@/lib/format';
import { useUnreadCount } from '@/lib/queries';
import { Card, SectionTitle } from '@/components/ui';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { data: unread } = useUnreadCount();
  const [changingPassword, setChangingPassword] = useState(false);

  const logoutEverywhere = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout-all');
    },
    onSuccess: () => void logout(),
  });

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-d" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 pb-10">
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

        {/* Quick links */}
        <SectionTitle>Inbox</SectionTitle>
        <Card>
          <ActionRow
            icon="bell-outline"
            label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
            onPress={() => router.push('/notifications')}
          />
        </Card>

        <SectionTitle>App</SectionTitle>
        <Card>
          <ActionRow
            icon="star-four-points-outline"
            label="What's new"
            onPress={() => router.push('/changelog' as Href)}
          />
          <ActionRow icon="information-outline" label="About" onPress={() => router.push('/about' as Href)} />
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

        {/* Credits */}
        <Pressable onPress={() => router.push('/about' as Href)} className="mt-8 items-center gap-1">
          <Text className="text-xs text-on-surface-variant">
            Community Finance · transparent by design
          </Text>
          <View className="flex-row items-center gap-1.5">
            <MaterialCommunityIcons name="hammer-wrench" size={12} color="#777680" />
            <Text className="text-xs font-semibold text-on-surface-variant">
              Built by Setups Works
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
