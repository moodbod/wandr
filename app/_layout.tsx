import { ThemeProvider } from '@react-navigation/native';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { isRunningInExpoGo } from 'expo';
import { router, Stack, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { lazy, Suspense, useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AppSidebar } from '@/components/wandr/app-sidebar';
import { IncomingFriendCallCenter } from '@/components/wandr/friends/incoming-friend-call-center';
import { TripNotificationCenter } from '@/components/wandr/notifications/trip-notification-center';
import { PwaInstallBanner } from '@/components/wandr/pwa-install-banner';
import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { ActiveFriendCallProvider } from '@/hooks/use-active-friend-call';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PlanningLocationProvider } from '@/hooks/use-planning-location';
import { useResponsive } from '@/hooks/use-responsive';
import { convexAuthStorage } from '@/lib/convex-auth-storage';
import { convexClient } from '@/lib/convex';
import { getNavigationBackground, getNavigationTheme, getStackScreenOptions } from '@/lib/navigation-theme';
import { AuthSessionProvider, useAuthSession } from '@/providers/auth-session';

const ActiveFriendCallOverlay = lazy(() => import('@/components/wandr/friends/active-friend-call-overlay'));
const PUBLIC_ROUTE_ROOTS = new Set(['explore', 'stays']);
const PUBLIC_TAB_ROUTES = new Set(['explore', 'stays']);

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const navigationTheme = getNavigationTheme(isDark);
  const stackScreenOptions = getStackScreenOptions(isDark);
  const backgroundColor = getNavigationBackground(isDark);

  if (!convexClient) {
    return <LoadingSessionScreen backgroundColor={backgroundColor} label="Missing EXPO_PUBLIC_CONVEX_URL." />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor }}>
      <ConvexAuthProvider
        client={convexClient}
        replaceURL={(url) => {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.history.replaceState({}, '', url);
          }
        }}
        shouldHandleCode={Platform.OS === 'web'}
        storage={convexAuthStorage}>
        <PlanningLocationProvider>
          <AuthSessionProvider>
            <ThemeProvider value={navigationTheme}>
              <AppShell backgroundColor={backgroundColor} stackScreenOptions={stackScreenOptions} />
            </ThemeProvider>
          </AuthSessionProvider>
        </PlanningLocationProvider>
      </ConvexAuthProvider>
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
    position: 'relative',
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
  const canUseCallOverlay = Platform.OS === 'web' || canUseNativeCalls;
  const isSignedIn = Boolean(session);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const root = document.getElementById('root');
    if (!root) {
      return;
    }

    if (isLargeScreen) {
      root.style.width = '125vw';
      root.style.height = '125vh';
      root.style.overflow = 'hidden';
      (root.style as any).zoom = '0.8';
    } else {
      root.style.width = '';
      root.style.height = '';
      root.style.overflow = '';
      (root.style as any).zoom = '';
    }

    return () => {
      root.style.width = '';
      root.style.height = '';
      root.style.overflow = '';
      (root.style as any).zoom = '';
    };
  }, [isLargeScreen]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const styleId = 'wandr-web-document-theme';
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      input,
      textarea,
      [contenteditable="true"],
      [role="button"] {
        outline: none !important;
        box-shadow: none !important;
        -webkit-tap-highlight-color: transparent;
      }

      input,
      textarea {
        font-size: 16px !important;
      }

      input:focus,
      input:focus-visible,
      textarea:focus,
      textarea:focus-visible,
      [contenteditable="true"]:focus,
      [contenteditable="true"]:focus-visible,
      [role="button"]:focus,
      [role="button"]:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const root = document.getElementById('root');
    const previousHtmlBackground = document.documentElement.style.backgroundColor;
    const previousHtmlColorScheme = document.documentElement.style.colorScheme;
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousBodyColorScheme = document.body.style.colorScheme;
    const previousRootBackground = root?.style.backgroundColor;

    document.documentElement.style.backgroundColor = backgroundColor;
    document.documentElement.style.colorScheme = backgroundColor === designSystem.colors.darkBackground ? 'dark' : 'light';
    document.body.style.backgroundColor = backgroundColor;
    document.body.style.colorScheme = document.documentElement.style.colorScheme;
    if (root) {
      root.style.backgroundColor = backgroundColor;
    }

    return () => {
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      document.documentElement.style.colorScheme = previousHtmlColorScheme;
      document.body.style.backgroundColor = previousBodyBackground;
      document.body.style.colorScheme = previousBodyColorScheme;
      if (root) {
        root.style.backgroundColor = previousRootBackground ?? '';
      }
    };
  }, [backgroundColor]);

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
            <Stack screenOptions={{ ...stackScreenOptions, headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="explore" options={{ headerShown: false }} />
              <Stack.Screen name="trip" options={{ headerShown: false }} />
              <Stack.Screen name="stays" options={{ headerShown: false }} />
              <Stack.Screen name="friends" options={{ headerShown: false }} />
              <Stack.Screen name="notifications" options={{ headerShown: false }} />
              <Stack.Screen name="profile" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
          </View>
        </View>
      </View>

      <AuthRouteGate />
      {convexClient && isSignedIn ? <TripNotificationCenter /> : null}
      {convexClient && isSignedIn && canUseNativeCalls ? <IncomingFriendCallCenter /> : null}
      {convexClient && isSignedIn && canUseCallOverlay ? (
        <Suspense fallback={null}>
          <ActiveFriendCallOverlay />
        </Suspense>
      ) : null}
      <PwaInstallBanner />
      <StatusBar style="auto" />
    </ActiveFriendCallProvider>
  );
}

function AuthRouteGate() {
  const segments = useSegments();
  const pathname = usePathname();
  const { isLoading, session } = useAuthSession();
  const isAuthRoute = segments[0] === '(auth)';
  const isPublicRoute =
    PUBLIC_ROUTE_ROOTS.has(String(segments[0])) ||
    (segments[0] === '(tabs)' && (!segments[1] || PUBLIC_TAB_ROUTES.has(String(segments[1]))));

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!session && !isAuthRoute && !isPublicRoute) {
      router.replace({
        pathname: '/(auth)',
        params: { returnTo: pathname || '/(tabs)/explore' },
      });
      return;
    }
  }, [isAuthRoute, isLoading, isPublicRoute, pathname, session]);

  return null;
}

function LoadingSessionScreen({ backgroundColor, label }: { backgroundColor: string; label?: string }) {
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
      {label ? (
        <View style={{ marginTop: designSystem.spacing.md }}>
          <ThemedText>{label}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}
