import { Stack } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStackScreenOptions } from '@/lib/navigation-theme';

export default function StaysLayout() {
  const isDark = useColorScheme() === 'dark';

  return (
    <Stack screenOptions={{ ...getStackScreenOptions(isDark), headerShown: false }}>
      <Stack.Screen name="map-search" options={{ title: 'Map search' }} />
      <Stack.Screen name="details" options={{ title: 'Stay details' }} />
    </Stack>
  );
}
