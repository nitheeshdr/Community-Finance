import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;

  // Floating navigation bar: detached from the screen edges, rounded, and
  // elevated so content scrolls beneath it (Material 3 floating nav bar).
  const bottomGap = Math.max(insets.bottom, 12);

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
        // Let the floating bar overlay content; screens add their own
        // bottom padding so nothing hides permanently behind it.
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: bottomGap,
          height: 68,
          borderRadius: 34,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: s.surfaceContainerHigh,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000000',
          shadowOpacity: 0.14,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
        },
        tabBarItemStyle: { paddingTop: 2 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        // Push scene content above the floating bar so the last rows clear it.
        sceneStyle: {
          backgroundColor: s.surface,
          paddingBottom: 68 + bottomGap + (Platform.OS === 'ios' ? 8 : 12),
        },
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
