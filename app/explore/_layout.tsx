import { Stack } from 'expo-router';

export default function ExploreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="hidden-gems" options={{ title: 'Hidden gems' }} />
      <Stack.Screen name="search" options={{ title: 'Search discovery' }} />
      <Stack.Screen name="[slug]" options={{ title: 'Experience' }} />
      <Stack.Screen name="hidden-gems/[slug]" options={{ title: 'Hidden Gem' }} />
    </Stack>
  );
}
