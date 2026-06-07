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
  const nativeFormHeaderOptions = (title: string) => ({
    title,
    headerTitle: title,
    headerLargeTitle: false,
    headerLargeTitleEnabled: false,
    headerBackVisible: true,
    headerTransparent: false,
  });

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
      <Stack.Screen name="edit" options={nativeFormHeaderOptions('Account')} />
      <Stack.Screen name="preferences" options={nativeFormHeaderOptions('Preferences')} />
      <Stack.Screen name="notifications" options={nativeFormHeaderOptions('Notifications')} />
      <Stack.Screen name="business" options={{ title: 'My business', ...childHeaderOptions }} />
      <Stack.Screen name="privacy" options={nativeFormHeaderOptions('Privacy')} />
      <Stack.Screen name="account" options={nativeFormHeaderOptions('Account')} />
    </Stack>
  );
}
