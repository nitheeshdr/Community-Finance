import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';
import { PaperProvider } from 'react-native-paper';
import { en, registerTranslation } from 'react-native-paper-dates';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { getScheme, paperLightTheme } from '@/lib/theme';
import '../global.css';

SplashScreen.preventAutoHideAsync();

// Locale for the Material date picker (react-native-paper-dates).
registerTranslation('en', en);

// App is light-only — lock NativeWind's scheme so `dark:` never activates.
colorScheme.set('light');

const scheme = getScheme(false);

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Auth gate: unauthenticated users only see /login.
  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();
    const inLogin = segments[0] === 'login';
    if (!user && !inLogin) {
      router.replace('/login');
    } else if (user && inLogin) {
      router.replace('/');
    }
  }, [user, loading, segments, router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: scheme.surface },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="events/[id]"
          options={{
            headerShown: true,
            title: 'Event',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: scheme.surface },
            headerTintColor: scheme.onSurface,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            title: 'Notifications',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: scheme.surface },
            headerTintColor: scheme.onSurface,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="about"
          options={{
            headerShown: true,
            title: 'About',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: scheme.surface },
            headerTintColor: scheme.onSurface,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="changelog"
          options={{
            headerShown: true,
            title: "What's new",
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: scheme.surface },
            headerTintColor: scheme.onSurface,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PaperProvider theme={paperLightTheme}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
