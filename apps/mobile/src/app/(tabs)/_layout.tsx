import { View, useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const dark = useColorScheme() === 'dark';
  const s = getScheme(dark);

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
        name="more"
        options={{
          title: 'More',
          tabBarIcon: screenIcon('dots-horizontal', 'dots-horizontal-circle'),
        }}
      />
    </Tabs>
  );
}
