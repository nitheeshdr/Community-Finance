import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { EventDto } from '@community-finance/shared';
import { formatDate, inr } from '@/lib/format';
import { useEvents } from '@/lib/queries';
import { Card, EmptyState, StatusBadge } from '@/components/ui';

export default function EventsScreen() {
  const { data, isLoading, refetch, isRefetching } = useEvents(1);
  const events = data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-d" edges={['top']}>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        ListHeaderComponent={
          <>
            <Text className="mb-1 mt-2 text-xl font-bold text-on-surface dark:text-on-surface-d">
              Events
            </Text>
            <Text className="mb-4 text-sm text-on-surface-variant dark:text-on-surface-variant-d">
              Every budget is split equally among active members
            </Text>
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <Card>
              <EmptyState
                icon="calendar-blank-outline"
                title="No events yet"
                description="Festivals, meetings, and collections will appear here."
              />
            </Card>
          ) : null
        }
        renderItem={({ item }) => <EventCard event={item} />}
      />
    </SafeAreaView>
  );
}

function EventCard({ event }: { event: EventDto }) {
  const progress =
    event.budget > 0
      ? Math.min(100, Math.round((event.collectedAmount / event.budget) * 100))
      : 0;

  return (
    <Link href={{ pathname: '/events/[id]', params: { id: event.id } }} asChild>
      <Pressable className="mb-3 active:opacity-80">
        <Card>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-base font-semibold text-on-surface dark:text-on-surface-d">
                {event.name}
              </Text>
              <Text className="mt-0.5 text-xs text-on-surface-variant dark:text-on-surface-variant-d">{formatDate(event.date)}</Text>
            </View>
            <StatusBadge status={event.status} />
          </View>

          <View className="mt-3 flex-row justify-between">
            <View>
              <Text className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-d">Budget</Text>
              <Text className="text-sm font-semibold text-on-surface tabular-nums dark:text-on-surface-d">
                {inr(event.budget)}
              </Text>
            </View>
            <View>
              <Text className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-d">Your share</Text>
              <Text className="text-sm font-semibold text-on-surface tabular-nums dark:text-on-surface-d">
                {inr(event.perHeadAmount)}
              </Text>
            </View>
            <View>
              <Text className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-d">Collected</Text>
              <Text className="text-sm font-semibold text-success dark:text-success-d tabular-nums">
                {inr(event.collectedAmount)}
              </Text>
            </View>
          </View>

          <View className="mt-3">
            <View className="mb-1 flex-row justify-between">
              <Text className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-d">Collection progress</Text>
              <Text className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-d">{progress}%</Text>
            </View>
            <View className="h-1.5 overflow-hidden rounded-full bg-surface-variant dark:bg-surface-variant-d">
              <View className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </View>
          </View>

          <View className="mt-2 flex-row items-center justify-end">
            <Text className="text-xs font-medium text-primary dark:text-primary-d">
              View details
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#4f46e5" />
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
