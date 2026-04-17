import { Stack } from 'expo-router';

export default function TripLayout() {
  return (
    <Stack>
      <Stack.Screen name="day-plan" options={{ title: 'Day plan' }} />
      <Stack.Screen name="map" options={{ title: 'Trip map' }} />
    </Stack>
  );
}
