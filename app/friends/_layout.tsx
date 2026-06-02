import { Stack, useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStackScreenOptions } from '@/lib/navigation-theme';

export default function FriendsLayout() {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/friends');
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
      <Stack.Screen name="discover" options={{ title: 'Friends discovery', ...hiddenTitleOptions }} />
      <Stack.Screen name="chat/index" options={{ title: 'Friends chat list', ...hiddenTitleOptions }} />
      <Stack.Screen name="call/[callId]" options={{ title: 'Friend call', ...hiddenTitleOptions }} />
      <Stack.Screen name="group/[circleId]" options={{ title: 'Friends group chat', ...hiddenTitleOptions }} />
      <Stack.Screen name="direct/[threadId]" options={{ title: 'Direct friend chat', ...hiddenTitleOptions }} />
      <Stack.Screen name="support/index" options={{ title: 'Support chat', ...hiddenTitleOptions }} />
      <Stack.Screen name="support/[threadId]" options={{ title: 'Support chat', ...hiddenTitleOptions }} />
      <Stack.Screen name="profile/[travelerSlug]" options={{ title: 'Friend profile', ...hiddenTitleOptions }} />
    </Stack>
  );
}
