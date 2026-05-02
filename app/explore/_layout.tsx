import { Stack } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStackScreenOptions } from '@/lib/navigation-theme';

export default function ExploreLayout() {
  const isDark = useColorScheme() === 'dark';

  return (
    <Stack screenOptions={{ ...getStackScreenOptions(isDark), headerShown: false }}>
      <Stack.Screen name="group/[circleId]" options={{ title: 'Group Trip' }} />
      <Stack.Screen name="hidden-gems" options={{ title: 'Hidden gems' }} />
      <Stack.Screen name="search" options={{ title: 'Search discovery' }} />
      <Stack.Screen name="[slug]" options={{ title: 'Experience' }} />
      <Stack.Screen name="hidden-gems/[slug]" options={{ title: 'Hidden Gem' }} />
    </Stack>
  );
}
