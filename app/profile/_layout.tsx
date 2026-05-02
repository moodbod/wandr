import { Stack } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStackScreenOptions } from '@/lib/navigation-theme';

export default function ProfileLayout() {
  const isDark = useColorScheme() === 'dark';

  return (
    <Stack screenOptions={{ ...getStackScreenOptions(isDark), headerShown: false }}>
      <Stack.Screen name="overview" options={{ title: 'Profile overview' }} />
      <Stack.Screen name="edit" options={{ title: 'Edit profile' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
    </Stack>
  );
}
