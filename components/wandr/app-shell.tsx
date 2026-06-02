import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { lazy, Suspense } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AuthRouteGate } from '@/components/wandr/auth-route-gate';
import { LocationSharingPublisherGate } from '@/components/wandr/location-sharing-publisher';
import { PwaCacheRegistrar } from '@/components/wandr/pwa-cache-registrar';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { useWebDocumentShell } from '@/hooks/use-web-document-shell';
import { convexClient } from '@/lib/convex';
import { getStackScreenOptions } from '@/lib/navigation-theme';
import { useAuthSession } from '@/providers/auth-session';

const AppSidebar = lazy(() => import('@/components/wandr/app-sidebar').then((m) => ({ default: m.AppSidebar })));
const PwaInstallBanner = lazy(() => import('@/components/wandr/pwa-install-banner').then((m) => ({ default: m.PwaInstallBanner })));
const TripNotificationCenter = lazy(() =>
  import('@/components/wandr/notifications/trip-notification-center').then((m) => ({ default: m.TripNotificationCenter }))
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
  const colorScheme = useColorScheme();
  const isSignedIn = Boolean(session);
  const router = useRouter();
  const goBackToTabs = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/profile');
  };
  const headerLeftItems = () => [
    {
      type: 'button',
      label: 'Back',
      icon: { type: 'sfSymbol', name: 'chevron.left' },
      sharesBackground: true,
      variant: 'plain',
      onPress: goBackToTabs,
    },
  ] as any;

  useWebDocumentShell({ backgroundColor, isLargeScreen });

  if (isLoading && Platform.OS !== 'web') {
    return (
      <>
        <LoadingSessionScreen backgroundColor={backgroundColor} />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </>
    );
  }

  return (
    <View style={[styles.shellViewport, { backgroundColor }]}>
      <View style={styles.shellRoot}>
        {isLargeScreen ? (
          <Suspense fallback={null}>
            <AppSidebar />
          </Suspense>
        ) : null}
        <View style={styles.content}>
          <Stack screenOptions={{ ...stackScreenOptions, headerShown: false, headerTitle: '', title: '' }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="explore" options={{ headerShown: false }} />
            <Stack.Screen name="trip" options={{ headerShown: false }} />
            <Stack.Screen name="stays" options={{ headerShown: false }} />
            <Stack.Screen name="friends" options={{ headerShown: false }} />
            <Stack.Screen
              name="notifications"
              options={{
                headerBackButtonDisplayMode: 'default',
                headerLargeTitle: false,
                headerLargeTitleEnabled: false,
                headerShadowVisible: false,
                headerShown: true,
                headerTransparent: true,
                headerTitle: '',
                title: '',
                unstable_headerLeftItems: headerLeftItems,
              }}
            />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ headerTitle: '', presentation: 'modal', title: '' }} />
          </Stack>
        </View>
      </View>

      <AuthRouteGate />
      <LocationSharingPublisherGate />
      <TripNotificationCenterGate enabled={Boolean(convexClient && isSignedIn)} />
      <PwaCacheRegistrar />
      <Suspense fallback={null}>
        <PwaInstallBanner />
      </Suspense>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </View>
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

export function LoadingSessionScreen({ backgroundColor, label }: { backgroundColor: string; label?: string }) {
  return (
    <View style={{ alignItems: 'center', backgroundColor, flex: 1, justifyContent: 'center' }}>
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
  content: { flex: 1, minWidth: 0 },
  shellViewport: { flex: 1, overflow: 'hidden' },
  shellRoot: { flex: 1, position: 'relative' },
});
