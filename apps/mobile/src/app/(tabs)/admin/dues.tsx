import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MemberDueDto } from '@community-finance/shared';
import { useDues } from '@/lib/admin';
import { inr, initials } from '@/lib/format';
import { EmptyState, StatusBadge } from '@/components/ui';

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y!, m! - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function label(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
    new Date(y!, m! - 1, 1)
  );
}

export default function DuesScreen() {
  const [period, setPeriod] = useState(currentPeriod());
  const [search, setSearch] = useState('');
  const [onlyUnpaid, setOnlyUnpaid] = useState(true);
  const { data, isLoading, refetch, isRefetching } = useDues(period);

  const members = (data?.members ?? []).filter((m) => {
    if (onlyUnpaid && m.status === 'PAID') return false;
    if (search) {
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.phone.includes(search);
    }
    return true;
  });

  return (
    <View className="flex-1 bg-surface">
      {/* Month navigator */}
      <View className="flex-row items-center justify-between px-4 pt-3">
        <Pressable
          onPress={() => setPeriod((p) => shiftPeriod(p, -1))}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface-container"
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color="#1B1B21" />
        </Pressable>
        <Text className="text-base font-semibold text-on-surface">{label(period)}</Text>
        <Pressable
          onPress={() => setPeriod((p) => shiftPeriod(p, 1))}
          disabled={period >= currentPeriod()}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface-container"
          style={{ opacity: period >= currentPeriod() ? 0.4 : 1 }}
        >
          <MaterialCommunityIcons name="chevron-right" size={22} color="#1B1B21" />
        </Pressable>
      </View>

      {/* Summary */}
      <View className="flex-row gap-3 px-4 pt-3">
        <View className="flex-1 items-center rounded-m3-md bg-success-container py-2.5">
          <Text className="text-lg font-bold text-on-success-container tabular-nums">
            {data?.paid ?? 0}
          </Text>
          <Text className="text-xs text-on-success-container">Paid</Text>
        </View>
        <View className="flex-1 items-center rounded-m3-md bg-error-container py-2.5">
          <Text className="text-lg font-bold text-on-error-container tabular-nums">
            {data?.unpaid ?? 0}
          </Text>
          <Text className="text-xs text-on-error-container">Unpaid</Text>
        </View>
        <View className="flex-1 items-center rounded-m3-md bg-surface-container py-2.5">
          <Text className="text-lg font-bold text-on-surface tabular-nums">{inr(data?.fee ?? 0)}</Text>
          <Text className="text-xs text-on-surface-variant">Fee</Text>
        </View>
      </View>

      {/* Filters */}
      <View className="flex-row items-center gap-2 px-4 pt-3">
        <View className="flex-1">
          <TextInput
            mode="outlined"
            dense
            placeholder="Search…"
            value={search}
            onChangeText={setSearch}
            left={<TextInput.Icon icon="magnify" />}
          />
        </View>
        <Pressable
          onPress={() => setOnlyUnpaid((v) => !v)}
          className={`flex-row items-center gap-1 rounded-full px-3 py-2 ${onlyUnpaid ? 'bg-primary' : 'bg-surface-container'}`}
        >
          <MaterialCommunityIcons
            name={onlyUnpaid ? 'check' : 'filter-variant'}
            size={14}
            color={onlyUnpaid ? '#fff' : '#5D5C72'}
          />
          <Text className={`text-xs font-semibold ${onlyUnpaid ? 'text-white' : 'text-on-surface-variant'}`}>
            Unpaid
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator className="py-16" />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.memberId}
          contentContainerClassName="px-4 py-3"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          ListEmptyComponent={
            <EmptyState
              icon="check-all"
              title={onlyUnpaid ? 'Everyone has paid' : 'No members'}
              description={onlyUnpaid ? `All active members paid for ${label(period)}.` : undefined}
            />
          }
          renderItem={({ item }) => <DueRow member={item} />}
        />
      )}
    </View>
  );
}

function DueRow({ member }: { member: MemberDueDto }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/admin/ledger?id=${member.memberId}` as Href)}
      className="mb-2 flex-row items-center gap-3 rounded-m3-lg bg-surface-container p-3 active:opacity-80"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-container">
        <Text className="text-xs font-bold text-on-primary-container">{initials(member.name)}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-on-surface">{member.name}</Text>
        <Text className="text-xs text-on-surface-variant">{member.phone}</Text>
      </View>
      <Text className="mr-2 text-sm font-medium text-on-surface tabular-nums">{inr(member.amount)}</Text>
      <StatusBadge status={member.status} />
      <MaterialCommunityIcons name="chevron-right" size={18} color="#777680" />
    </Pressable>
  );
}
