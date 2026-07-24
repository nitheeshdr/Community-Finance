import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Logo } from '@/components/logo';

const VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-6 py-10">
      {/* Brand */}
      <View className="items-center">
        <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-primary-container">
          <Logo size={64} />
        </View>
        <Text className="text-2xl font-bold text-on-surface">Community Finance</Text>
        <Text className="mt-1 text-sm text-on-surface-variant">Version {VERSION}</Text>
      </View>

      {/* What's new */}
      <Pressable
        onPress={() => router.push('/changelog' as Href)}
        className="mt-8 flex-row items-center gap-3 rounded-m3-lg bg-surface-container p-4 active:opacity-80"
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-container">
          <MaterialCommunityIcons name="star-four-points-outline" size={20} color="#4F46E5" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-on-surface">What&rsquo;s new</Text>
          <Text className="text-xs text-on-surface-variant">Release notes and updates</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#777680" />
      </Pressable>

      {/* Built by Setups Works */}
      <View className="mt-8 items-center">
        <Text className="text-xs uppercase tracking-wider text-on-surface-variant">Built by</Text>
        <Text className="mt-1 text-lg font-bold text-on-surface">Setups Works</Text>
        <Text className="mt-0.5 text-xs text-on-surface-variant">The Digital Agency</Text>

        <Pressable
          onPress={() => void Linking.openURL('https://setups.works')}
          className="mt-4 flex-row items-center gap-1.5"
        >
          <MaterialCommunityIcons name="web" size={15} color="#4F46E5" />
          <Text className="text-sm font-medium text-primary">setups.works</Text>
        </Pressable>
        <Pressable
          onPress={() => void Linking.openURL('mailto:info@setups.works')}
          className="mt-2 flex-row items-center gap-1.5"
        >
          <MaterialCommunityIcons name="email-outline" size={15} color="#4F46E5" />
          <Text className="text-sm font-medium text-primary">info@setups.works</Text>
        </Pressable>
      </View>

      <Text className="mt-10 text-center text-xs text-on-surface-variant">
        Transparent finances for your community.
      </Text>
    </ScrollView>
  );
}
