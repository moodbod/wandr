import { Stack } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStackScreenOptions } from '@/lib/navigation-theme';

export default function FriendsLayout() {
  const isDark = useColorScheme() === 'dark';

  return (
    <Stack screenOptions={{ ...getStackScreenOptions(isDark), headerShown: false }}>
      <Stack.Screen name="discover" options={{ title: 'Friends discovery' }} />
      <Stack.Screen name="chat/index" options={{ title: 'Friends chat list' }} />
      <Stack.Screen name="call/[callId]" options={{ title: 'Friend call' }} />
      <Stack.Screen name="group/[circleId]" options={{ title: 'Friends group chat' }} />
      <Stack.Screen name="direct/[threadId]" options={{ title: 'Direct friend chat' }} />
      <Stack.Screen name="profile/[travelerSlug]" options={{ title: 'Friend profile' }} />
    </Stack>
  );
}
