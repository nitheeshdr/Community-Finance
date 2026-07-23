import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { getScheme, paperDarkTheme, paperLightTheme } from '@/lib/theme';
import { loadThemePref } from '@/lib/theme-pref';
import '../global.css';

// Apply the saved light/dark preference before first paint.
void loadThemePref();

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const scheme = getScheme(dark);

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
      <StatusBar style={dark ? 'light' : 'dark'} />
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
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  return (
    <PaperProvider theme={dark ? paperDarkTheme : paperLightTheme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </PaperProvider>
  );
}
