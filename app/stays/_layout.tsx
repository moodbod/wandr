import { Stack } from 'expo-router';

export default function StaysLayout() {
  return (
    <Stack>
      <Stack.Screen name="map-search" options={{ title: 'Map search' }} />
      <Stack.Screen name="details" options={{ title: 'Stay details' }} />
    </Stack>
  );
}
