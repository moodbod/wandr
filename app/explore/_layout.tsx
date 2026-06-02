import { Stack, useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStackScreenOptions } from '@/lib/navigation-theme';

export default function ExploreLayout() {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/explore');
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
      <Stack.Screen name="group/[circleId]" options={{ title: 'Group Trip', ...hiddenTitleOptions }} />
      <Stack.Screen name="hidden-gems" options={{ title: 'Hidden gems', ...hiddenTitleOptions }} />
      <Stack.Screen name="search" options={hiddenTitleOptions} />
      <Stack.Screen name="[slug]" options={{ title: 'Experience', ...hiddenTitleOptions }} />
      <Stack.Screen name="hidden-gems/[slug]" options={{ title: 'Hidden Gem', ...hiddenTitleOptions }} />
    </Stack>
  );
}
