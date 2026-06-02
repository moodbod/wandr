import { ThemeProvider } from "expo-router/react-navigation";
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AppShell, LoadingSessionScreen } from '@/components/wandr/app-shell';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PlanningLocationProvider } from '@/hooks/use-planning-location';
import { convexAuthStorage } from '@/lib/convex-auth-storage';
import { convexClient } from '@/lib/convex';
import { getNavigationBackground, getNavigationTheme, getStackScreenOptions } from '@/lib/navigation-theme';
import { AuthSessionProvider } from '@/providers/auth-session';
import { AuthSheetProvider } from '@/providers/auth-sheet';

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
