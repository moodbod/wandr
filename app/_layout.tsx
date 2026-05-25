import { ThemeProvider } from '@react-navigation/native';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { isRunningInExpoGo } from 'expo';
import { Stack, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { lazy, Suspense, useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { PwaCacheRegistrar } from '@/components/wandr/pwa-cache-registrar';
import { designSystem } from '@/constants/design-system';
import { ActiveFriendCallProvider } from '@/hooks/use-active-friend-call';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PlanningLocationProvider } from '@/hooks/use-planning-location';
import { useResponsive } from '@/hooks/use-responsive';
import { convexAuthStorage } from '@/lib/convex-auth-storage';
import { convexClient } from '@/lib/convex';
import { getNavigationBackground, getNavigationTheme, getStackScreenOptions } from '@/lib/navigation-theme';
import { AuthSessionProvider, useAuthSession } from '@/providers/auth-session';
import { AuthSheetProvider, useAuthSheet } from '@/providers/auth-sheet';

const ActiveFriendCallOverlay = lazy(() => import('@/components/wandr/friends/active-friend-call-overlay'));
const AppSidebar = lazy(() => import('@/components/wandr/app-sidebar').then((module) => ({ default: module.AppSidebar })));
const IncomingFriendCallCenter = lazy(() =>
  import('@/components/wandr/friends/incoming-friend-call-center').then((module) => ({
    default: module.IncomingFriendCallCenter,
  }))
);
const PwaInstallBanner = lazy(() =>
  import('@/components/wandr/pwa-install-banner').then((module) => ({ default: module.PwaInstallBanner }))
);
const TripNotificationCenter = lazy(() =>
  import('@/components/wandr/notifications/trip-notification-center').then((module) => ({
    default: module.TripNotificationCenter,
  }))
);
const PUBLIC_ROUTE_ROOTS = new Set(['explore', 'stays']);
const PUBLIC_TAB_ROUTES = new Set(['index', 'explore', 'stays']);

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const navigationTheme = getNavigationTheme(isDark);
  const stackScreenOptions = getStackScreenOptions(isDark);
  const backgroundColor = getNavigationBackground(isDark);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    SystemUI.setBackgroundColorAsync(backgroundColor).catch(() => {});
  }, [backgroundColor]);

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
            <AuthSheetProvider>
              <ThemeProvider value={navigationTheme}>
                <AppShell backgroundColor={backgroundColor} stackScreenOptions={stackScreenOptions} />
              </ThemeProvider>
            </AuthSheetProvider>
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

    document.title = 'Wandr';
  }, []);

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

  if (isLoading && Platform.OS !== 'web') {
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
          {isLargeScreen ? (
            <Suspense fallback={null}>
              <AppSidebar />
            </Suspense>
          ) : null}
          <View style={styles.content}>
            <Stack screenOptions={{ ...stackScreenOptions, headerShown: false, title: 'Wandr' }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
      <WebIdlePreloader isLargeScreen={isLargeScreen} isSignedIn={isSignedIn} />
      {convexClient && isSignedIn ? (
        <Suspense fallback={null}>
          <TripNotificationCenter />
        </Suspense>
      ) : null}
      {convexClient && isSignedIn && canUseNativeCalls ? (
        <Suspense fallback={null}>
          <IncomingFriendCallCenter />
        </Suspense>
      ) : null}
      {convexClient && isSignedIn && canUseCallOverlay ? (
        <Suspense fallback={null}>
          <ActiveFriendCallOverlay />
        </Suspense>
      ) : null}
      <PwaCacheRegistrar />
      <Suspense fallback={null}>
        <PwaInstallBanner />
      </Suspense>
      <StatusBar style="auto" />
    </ActiveFriendCallProvider>
  );
}

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

function WebIdlePreloader({ isLargeScreen, isSignedIn }: { isLargeScreen: boolean; isSignedIn: boolean }) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    const connection = (navigator as NavigatorWithConnection).connection;
    if (connection?.saveData) {
      return;
    }

    let cancelled = false;
    const preload = () => {
      if (cancelled) {
        return;
      }

      void import('@/components/wandr/maps/map-preview');
      void import('@/components/wandr/stays/stays-map-screen');
      void import('@/app/(tabs)/stays');

      if (isLargeScreen) {
        void import('@/components/wandr/app-sidebar');
      }

      if (isSignedIn) {
        void import('@/app/(tabs)/trip');
        void import('@/app/(tabs)/friends');
        void import('@/components/wandr/notifications/trip-notification-center');
      }
    };

    const webWindow = window as IdleWindow;
    if (typeof webWindow.requestIdleCallback === 'function') {
      const idleId = webWindow.requestIdleCallback(preload, { timeout: 2400 });
      return () => {
        cancelled = true;
        webWindow.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(preload, 900);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, [isLargeScreen, isSignedIn]);

  return null;
}

function AuthRouteGate() {
  const segments: readonly string[] = useSegments();
  const pathname = usePathname();
  const { openAuthSheet } = useAuthSheet();
  const { isAuthenticated, isLoading } = useAuthSession();
  const pathSegments = pathname.split('/').filter(Boolean);
  const [routeRoot, routeLeaf] = pathSegments;
  const segmentRoot = String(segments[0] ?? '');
  const segmentLeaf = String(segments[1] ?? '');
  const isRootRoute = pathname === '/' || pathname === '';
  const isPublicRoute =
    isRootRoute ||
    PUBLIC_ROUTE_ROOTS.has(routeRoot ?? '') ||
    PUBLIC_ROUTE_ROOTS.has(segmentRoot) ||
    (segmentRoot === '(tabs)' && (!segmentLeaf || PUBLIC_TAB_ROUTES.has(segmentLeaf))) ||
    (routeRoot === '(tabs)' && (!routeLeaf || PUBLIC_TAB_ROUTES.has(routeLeaf)));

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated && !isPublicRoute) {
      openAuthSheet({
        dismissTo: '/(tabs)/explore',
        initialMode: 'signIn',
        returnTo: pathname || '/(tabs)/explore',
      });
      return;
    }
  }, [isAuthenticated, isLoading, isPublicRoute, openAuthSheet, pathname]);

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
