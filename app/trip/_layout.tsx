import { Stack, useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStackScreenOptions } from '@/lib/navigation-theme';

export default function TripLayout() {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/trip');
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
  const hiddenTitleOptions = { headerTitle: '' };

  return (
    <Stack
      screenOptions={{
        ...getStackScreenOptions(isDark),
        headerBackButtonDisplayMode: 'default',
        headerBackVisible: false,
        headerLargeTitle: false,
        headerLargeTitleEnabled: false,
        headerShadowVisible: false,
        headerShown: true,
        headerTransparent: true,
        unstable_headerLeftItems: headerLeftItems,
      }}>
      <Stack.Screen name="map" options={{ title: 'Trip map', ...hiddenTitleOptions }} />
    </Stack>
  );
}
