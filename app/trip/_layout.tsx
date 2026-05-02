import { Stack } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStackScreenOptions } from '@/lib/navigation-theme';

export default function TripLayout() {
  const isDark = useColorScheme() === 'dark';

  return (
    <Stack screenOptions={{ ...getStackScreenOptions(isDark), headerShown: false }}>
      <Stack.Screen name="map" options={{ title: 'Trip map' }} />
    </Stack>
  );
}
