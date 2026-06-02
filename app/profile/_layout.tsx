import { Stack, useRouter } from 'expo-router';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStackScreenOptions } from '@/lib/navigation-theme';

export const unstable_settings = {
  initialRouteName: 'overview',
};

export default function ProfileLayout() {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const headerTextColor = isDark ? designSystem.colors.darkText : designSystem.colors.ink;
  const goBack = () => {
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
      onPress: goBack,
    },
  ] as any;
  const childHeaderOptions = {
    headerTitle: '',
    headerLargeTitle: false,
    headerLargeTitleEnabled: false,
    headerBackVisible: false,
    unstable_headerLeftItems: headerLeftItems,
  };

  return (
    <Stack
      screenOptions={{
        ...getStackScreenOptions(isDark),
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        headerShown: true,
        headerTransparent: true,
        headerBackButtonDisplayMode: 'default',
        headerTintColor: headerTextColor,
      }}>
      <Stack.Screen name="overview" options={{ title: 'Profile', ...childHeaderOptions }} />
      <Stack.Screen name="settings" options={{ title: 'Settings', ...childHeaderOptions }} />
      <Stack.Screen name="edit" options={{ title: 'Account', ...childHeaderOptions }} />
      <Stack.Screen name="preferences" options={{ title: 'Preferences', ...childHeaderOptions }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications', ...childHeaderOptions }} />
      <Stack.Screen name="business" options={{ title: 'My business', ...childHeaderOptions }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy', ...childHeaderOptions }} />
      <Stack.Screen name="account" options={{ title: 'Account', ...childHeaderOptions }} />
    </Stack>
  );
}
