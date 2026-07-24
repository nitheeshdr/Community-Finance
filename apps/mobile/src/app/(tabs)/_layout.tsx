import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UserRole } from '@community-finance/shared';
import { useAuth } from '@/lib/auth-context';
import { getScheme } from '@/lib/theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** M3 navigation bar icon: active state gets the tonal pill indicator. */
function NavIcon({
  focused,
  outline,
  filled,
  color,
  pill,
}: {
  focused: boolean;
  outline: IconName;
  filled: IconName;
  color: string;
  pill: string;
}) {
  return (
    <View
      style={{
        width: 64,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? pill : 'transparent',
      }}
    >
      <MaterialCommunityIcons name={focused ? filled : outline} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const s = getScheme(false);
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;

  const screenIcon =
    (outline: IconName, filled: IconName) =>
    ({ focused, color }: { focused: boolean; color: string }) => (
      <NavIcon
        focused={focused}
        outline={outline}
        filled={filled}
        color={color}
        pill={s.secondaryContainer}
      />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: s.onSecondaryContainer,
        tabBarInactiveTintColor: s.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: s.surfaceContainer,
          borderTopWidth: 0,
          height: 80,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: screenIcon('home-variant-outline', 'home-variant'),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: screenIcon('credit-card-outline', 'credit-card'),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: screenIcon('calendar-blank-outline', 'calendar-blank'),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          headerShown: false,
          // Hidden entirely for members; visible only to admins.
          href: isAdmin ? undefined : null,
          tabBarIcon: screenIcon('shield-outline', 'shield'),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: screenIcon('dots-horizontal', 'dots-horizontal-circle'),
        }}
      />
    </Tabs>
  );
}
