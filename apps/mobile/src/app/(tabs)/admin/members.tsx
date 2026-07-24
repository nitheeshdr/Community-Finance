import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';
import { Menu, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UserStatus, type MemberDto } from '@community-finance/shared';
import { useAdminMembers, useChangeMemberStatus } from '@/lib/admin';
import { apiErrorMessage } from '@/lib/api';
import { initials } from '@/lib/format';
import { StatusBadge, EmptyState } from '@/components/ui';

export default function AdminMembersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch, isRefetching } = useAdminMembers({ page, search });
  const members = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/admin/add-member' as Href)} hitSlop={8}>
              <MaterialCommunityIcons name="account-plus" size={22} color="#984447" />
            </Pressable>
          ),
        }}
      />
      <View className="flex-1 bg-surface">
        <View className="px-4 pt-3">
          <TextInput
            mode="outlined"
            dense
            placeholder="Search by name or phone…"
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setPage(1);
            }}
            left={<TextInput.Icon icon="magnify" />}
          />
        </View>
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerClassName="px-4 py-3"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                icon="account-group-outline"
                title="No members"
                description="Add members with the + button, or import them from the web dashboard."
              />
            ) : null
          }
          renderItem={({ item }) => <MemberRow member={item} />}
          ListFooterComponent={
            meta && meta.totalPages > 1 ? (
              <View className="mt-3 flex-row items-center justify-center gap-4">
                <Pressable
                  disabled={page <= 1}
                  onPress={() => setPage((p) => p - 1)}
                  className={`rounded-m3-sm border border-outline-variant px-3 py-1.5 ${page <= 1 ? 'opacity-40' : ''}`}
                >
                  <Text className="text-sm text-on-surface">Previous</Text>
                </Pressable>
                <Text className="text-xs text-on-surface-variant">
                  {meta.page} / {meta.totalPages}
                </Text>
                <Pressable
                  disabled={page >= meta.totalPages}
                  onPress={() => setPage((p) => p + 1)}
                  className={`rounded-m3-sm border border-outline-variant px-3 py-1.5 ${page >= meta.totalPages ? 'opacity-40' : ''}`}
                >
                  <Text className="text-sm text-on-surface">Next</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      </View>
    </>
  );
}

function MemberRow({ member }: { member: MemberDto }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusMutation = useChangeMemberStatus();

  function setStatus(status: UserStatus) {
    setMenuOpen(false);
    statusMutation.mutate(
      { id: member.id, status },
      { onError: (err) => Alert.alert('Update failed', apiErrorMessage(err)) }
    );
  }

  return (
    <View className="mb-2 flex-row items-center gap-3 rounded-m3-lg bg-surface-container p-3">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-container">
        <Text className="text-sm font-bold text-on-primary-container">{initials(member.name)}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-on-surface">{member.name}</Text>
        <Text className="text-xs text-on-surface-variant">{member.phone}</Text>
      </View>
      <StatusBadge status={member.status} />
      <Menu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        anchor={
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} className="p-1">
            <MaterialCommunityIcons name="dots-vertical" size={20} color="#777680" />
          </Pressable>
        }
      >
        {member.status !== UserStatus.ACTIVE && (
          <Menu.Item leadingIcon="account-check" onPress={() => setStatus(UserStatus.ACTIVE)} title="Activate" />
        )}
        {member.status !== UserStatus.SUSPENDED && (
          <Menu.Item leadingIcon="account-cancel" onPress={() => setStatus(UserStatus.SUSPENDED)} title="Suspend" />
        )}
        {member.status !== UserStatus.INACTIVE && (
          <Menu.Item leadingIcon="account-off" onPress={() => setStatus(UserStatus.INACTIVE)} title="Mark inactive" />
        )}
      </Menu>
    </View>
  );
}
