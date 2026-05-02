import { ThemeProvider } from '@react-navigation/native';
import { ConvexProvider } from 'convex/react';
import { isRunningInExpoGo } from 'expo';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { lazy, Suspense } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TripNotificationCenter } from '@/components/wandr/notifications/trip-notification-center';
import { ActiveFriendCallProvider } from '@/hooks/use-active-friend-call';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PlanningLocationProvider } from '@/hooks/use-planning-location';
import { convexClient } from '@/lib/convex';
import { getNavigationBackground, getNavigationTheme, getStackScreenOptions } from '@/lib/navigation-theme';

const ActiveFriendCallOverlay = lazy(() => import('@/components/wandr/friends/active-friend-call-overlay'));

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const navigationTheme = getNavigationTheme(isDark);
  const stackScreenOptions = getStackScreenOptions(isDark);
  const backgroundColor = getNavigationBackground(isDark);
  const canUseNativeCalls = Platform.OS !== 'web' && !isRunningInExpoGo();

  const app = (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="explore" options={{ headerShown: false }} />
        <Stack.Screen name="trip" options={{ headerShown: false }} />
        <Stack.Screen name="stays" options={{ headerShown: false }} />
        <Stack.Screen name="friends" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      {convexClient ? <TripNotificationCenter /> : null}
      {convexClient && canUseNativeCalls ? (
        <Suspense fallback={null}>
          <ActiveFriendCallOverlay />
        </Suspense>
      ) : null}
      <StatusBar style="auto" />
    </ThemeProvider>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor }}>
      <PlanningLocationProvider>
        <ActiveFriendCallProvider>
          {convexClient ? <ConvexProvider client={convexClient}>{app}</ConvexProvider> : app}
        </ActiveFriendCallProvider>
      </PlanningLocationProvider>
    </GestureHandlerRootView>
  );
}
