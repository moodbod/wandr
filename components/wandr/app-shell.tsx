import { isRunningInExpoGo } from 'expo';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { lazy, Suspense } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AuthRouteGate } from '@/components/wandr/auth-route-gate';
import { LocationSharingPublisherGate } from '@/components/wandr/location-sharing-publisher';
import { PwaCacheRegistrar } from '@/components/wandr/pwa-cache-registrar';
import { designSystem } from '@/constants/design-system';
import { ActiveFriendCallProvider, useActiveFriendCall } from '@/hooks/use-active-friend-call';
import { useResponsive } from '@/hooks/use-responsive';
import { useWebDocumentShell } from '@/hooks/use-web-document-shell';
import { convexClient } from '@/lib/convex';
import { getStackScreenOptions } from '@/lib/navigation-theme';
import { useAuthSession } from '@/providers/auth-session';

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

export function AppShell({
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

  useWebDocumentShell({ backgroundColor, isLargeScreen });

  if (isLoading && Platform.OS !== 'web') {
    return (
      <>
        <LoadingSessionScreen backgroundColor={backgroundColor} />
        <StatusBar style="light" />
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
              <Stack.Screen name="admin" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
          </View>
        </View>
      </View>

      <AuthRouteGate />
      <LocationSharingPublisherGate />
      <TripNotificationCenterGate enabled={Boolean(convexClient && isSignedIn)} />
      {convexClient && isSignedIn && canUseNativeCalls ? (
        <Suspense fallback={null}>
          <IncomingFriendCallCenter />
        </Suspense>
      ) : null}
      <ActiveFriendCallOverlayGate enabled={Boolean(convexClient && isSignedIn && canUseCallOverlay)} />
      <PwaCacheRegistrar />
      <Suspense fallback={null}>
        <PwaInstallBanner />
      </Suspense>
      <StatusBar style="light" />
    </ActiveFriendCallProvider>
  );
}

function TripNotificationCenterGate({ enabled }: { enabled: boolean }) {
  if (!enabled || (Platform.OS === 'web' && process.env.NODE_ENV !== 'production')) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <TripNotificationCenter />
    </Suspense>
  );
}

function ActiveFriendCallOverlayGate({ enabled }: { enabled: boolean }) {
  const { activeCallId } = useActiveFriendCall();

  if (!enabled || !activeCallId) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ActiveFriendCallOverlay />
    </Suspense>
  );
}

export function LoadingSessionScreen({ backgroundColor, label }: { backgroundColor: string; label?: string }) {
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
