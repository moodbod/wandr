import { ThemeProvider } from '@react-navigation/native';
import { ConvexProvider } from 'convex/react';
import { isRunningInExpoGo } from 'expo';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { lazy, Suspense, useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AppSidebar } from '@/components/wandr/app-sidebar';
import { IncomingFriendCallCenter } from '@/components/wandr/friends/incoming-friend-call-center';
import { TripNotificationCenter } from '@/components/wandr/notifications/trip-notification-center';
import { designSystem } from '@/constants/design-system';
import { ActiveFriendCallProvider } from '@/hooks/use-active-friend-call';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PlanningLocationProvider } from '@/hooks/use-planning-location';
import { useResponsive } from '@/hooks/use-responsive';
import { convexClient } from '@/lib/convex';
import { getNavigationBackground, getNavigationTheme, getStackScreenOptions } from '@/lib/navigation-theme';
import { AuthSessionProvider, useAuthSession } from '@/providers/auth-session';

const ActiveFriendCallOverlay = lazy(() => import('@/components/wandr/friends/active-friend-call-overlay'));

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const navigationTheme = getNavigationTheme(isDark);
  const stackScreenOptions = getStackScreenOptions(isDark);
  const backgroundColor = getNavigationBackground(isDark);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor }}>
      <PlanningLocationProvider>
        <AuthSessionProvider>
          <ThemeProvider value={navigationTheme}>
                {convexClient ? (
                  <ConvexProvider client={convexClient}>
                    <AppShell backgroundColor={backgroundColor} stackScreenOptions={stackScreenOptions} />
                  </ConvexProvider>
                ) : (
                  <AppShell backgroundColor={backgroundColor} stackScreenOptions={stackScreenOptions} />
                )}
          </ThemeProvider>
        </AuthSessionProvider>
      </PlanningLocationProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minWidth: 0,
  },
  shellViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  shellRoot: {
    flex: 1,
    flexDirection: 'row',
  },
});


function AppShell({
  backgroundColor,
  stackScreenOptions,
}: {
  backgroundColor: string;
  stackScreenOptions: ReturnType<typeof getStackScreenOptions>;
}) {
  const { isLoading, session } = useAuthSession();
  const { isLargeScreen } = useResponsive();
  const canUseNativeCalls = Platform.OS !== 'web' && !isRunningInExpoGo();
  const segments = useSegments();
  const isCallRoute = segments[0] === 'friends' && segments[1] === 'call';
  const isSignedIn = Boolean(session);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const root = document.getElementById('root');
    if (!root) {
      return;
    }

    if (!isLargeScreen) {
      root.style.width = '';
      root.style.height = '';
      root.style.overflow = '';
      (root.style as any).zoom = '';
      return;
    }

    root.style.width = '125vw';
    root.style.height = '125vh';
    root.style.overflow = 'hidden';
    (root.style as any).zoom = '0.8';

    return () => {
      root.style.width = '';
      root.style.height = '';
      root.style.overflow = '';
      (root.style as any).zoom = '';
    };
  }, [isLargeScreen]);

  if (isLoading) {
    return (
      <>
        <LoadingSessionScreen backgroundColor={backgroundColor} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <ActiveFriendCallProvider>
      <View style={[styles.shellViewport, { backgroundColor }]}>
        <View style={styles.shellRoot}>
          {isSignedIn && isLargeScreen && <AppSidebar />}
          <View style={styles.content}>
            <Stack screenOptions={stackScreenOptions}>
              <Stack.Protected guard={!isSignedIn}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              </Stack.Protected>

              <Stack.Protected guard={isSignedIn}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="explore" options={{ headerShown: false }} />
                <Stack.Screen name="trip" options={{ headerShown: false }} />
                <Stack.Screen name="stays" options={{ headerShown: false }} />
                <Stack.Screen name="friends" options={{ headerShown: false }} />
                <Stack.Screen name="notifications" options={{ headerShown: false }} />
                <Stack.Screen name="profile" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack.Protected>
            </Stack>
          </View>
        </View>
      </View>

      <AuthRouteGate />
      {convexClient && isSignedIn ? <TripNotificationCenter /> : null}
      {convexClient && isSignedIn && canUseNativeCalls ? <IncomingFriendCallCenter /> : null}
      {convexClient && isSignedIn && canUseNativeCalls && !isCallRoute ? (
        <Suspense fallback={null}>
          <ActiveFriendCallOverlay />
        </Suspense>
      ) : null}
      <StatusBar style="auto" />
    </ActiveFriendCallProvider>
  );
}

function AuthRouteGate() {
  const segments = useSegments();
  const { isLoading, session } = useAuthSession();
  const isAuthRoute = segments[0] === '(auth)';

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!session && !isAuthRoute) {
      router.replace('/(auth)');
      return;
    }

    if (session && isAuthRoute) {
      router.replace('/(tabs)/explore');
    }
  }, [isAuthRoute, isLoading, session]);

  return null;
}

function LoadingSessionScreen({ backgroundColor }: { backgroundColor: string }) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor,
        flex: 1,
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator color={designSystem.colors.lime} />
    </View>
  );
}
