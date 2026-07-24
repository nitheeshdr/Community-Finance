import { Stack } from 'expo-router';
import { getScheme } from '@/lib/theme';

/** Admin section — a stack inside the Admin tab. */
export default function AdminLayout() {
  const s = getScheme(false);
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: s.surface },
        headerTintColor: s.onSurface,
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: s.surface },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="members" options={{ title: 'Members' }} />
      <Stack.Screen name="add-member" options={{ title: 'Add member', presentation: 'modal' }} />
      <Stack.Screen name="approvals" options={{ title: 'Approvals' }} />
      <Stack.Screen name="report" options={{ title: 'Reports' }} />
      <Stack.Screen name="dues" options={{ title: 'Monthly dues' }} />
      <Stack.Screen name="ledger" options={{ title: 'Ledger' }} />
      <Stack.Screen name="create-event" options={{ title: 'Create event' }} />
      <Stack.Screen name="record-payment" options={{ title: 'Record payment' }} />
      <Stack.Screen name="add-expense" options={{ title: 'Add expense' }} />
      <Stack.Screen name="record-income" options={{ title: 'Record income' }} />
      <Stack.Screen name="announcement" options={{ title: 'Announcement' }} />
    </Stack>
  );
}
