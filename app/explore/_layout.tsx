import { Stack } from 'expo-router';

export default function ExploreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="search" options={{ title: 'Search discovery' }} />
      <Stack.Screen name="stories" options={{ title: 'Editorial stories' }} />
    </Stack>
  );
}
