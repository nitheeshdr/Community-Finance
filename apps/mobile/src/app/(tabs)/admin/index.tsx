import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, type Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UserRole } from '@community-finance/shared';
import { useAuth } from '@/lib/auth-context';
import { usePendingExpenses, usePendingPayments } from '@/lib/admin';
import { SectionTitle } from '@/components/ui';

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

const ACTIONS: { href: Href; label: string; icon: Icon }[] = [
  { href: '/admin/members' as Href, label: 'Members', icon: 'account-group-outline' },
  { href: '/admin/dues' as Href, label: 'Monthly dues', icon: 'calendar-clock' },
  { href: '/admin/create-event' as Href, label: 'Create event', icon: 'calendar-plus' },
  { href: '/admin/record-payment' as Href, label: 'Record payment', icon: 'cash-plus' },
  { href: '/admin/add-expense' as Href, label: 'Add expense', icon: 'receipt' },
  { href: '/admin/record-income' as Href, label: 'Record income', icon: 'cash-multiple' },
  { href: '/admin/report' as Href, label: 'Reports', icon: 'chart-box-outline' },
  { href: '/admin/announcement' as Href, label: 'Announce', icon: 'bullhorn-outline' },
];

export default function AdminHubScreen() {
  const { user } = useAuth();
  const { data: pendingPayments, refetch: rp, isRefetching: r1 } = usePendingPayments();
  const { data: pendingExpenses, refetch: re, isRefetching: r2 } = usePendingExpenses();

  const payCount = pendingPayments?.length ?? 0;
  const expCount = pendingExpenses?.length ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={r1 || r2}
            onRefresh={() => {
              void rp();
              void re();
            }}
          />
        }
      >
        <View className="mb-1 mt-2 flex-row items-center gap-2">
          <MaterialCommunityIcons name="shield-check" size={22} color="#4F46E5" />
          <Text className="text-xl font-bold text-on-surface">Admin</Text>
        </View>
        <Text className="mb-4 text-sm text-on-surface-variant">
          {user?.role === UserRole.SUPER_ADMIN ? 'Super admin' : 'Admin'} · {user?.name}
        </Text>

        <SectionTitle>Approvals</SectionTitle>
        <Link href={'/admin/approvals' as Href} asChild>
          <Pressable className="flex-row items-center gap-3 rounded-m3-lg bg-primary-container p-4 active:opacity-80">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-white/40">
              <MaterialCommunityIcons name="check-decagram-outline" size={22} color="#3B32C8" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-on-primary-container">
                Pending approvals
              </Text>
              <Text className="mt-0.5 text-xs text-on-primary-container/80">
                {payCount} payment{payCount === 1 ? '' : 's'} · {expCount} expense
                {expCount === 1 ? '' : 's'} awaiting review
              </Text>
            </View>
            {payCount + expCount > 0 && (
              <View className="h-7 min-w-7 items-center justify-center rounded-full bg-error px-1.5">
                <Text className="text-xs font-bold text-white">{payCount + expCount}</Text>
              </View>
            )}
            <MaterialCommunityIcons name="chevron-right" size={22} color="#3B32C8" />
          </Pressable>
        </Link>

        <SectionTitle>Quick actions</SectionTitle>
        <View className="flex-row flex-wrap gap-3">
          {ACTIONS.map((a) => (
            <Link key={a.label} href={a.href} asChild>
              <Pressable
                className="items-center rounded-m3-lg bg-surface-container p-4 active:opacity-80"
                style={{ width: '31%' }}
              >
                <View className="mb-2 h-11 w-11 items-center justify-center rounded-full bg-primary-container">
                  <MaterialCommunityIcons name={a.icon} size={20} color="#4F46E5" />
                </View>
                <Text className="text-center text-xs font-medium text-on-surface">{a.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
