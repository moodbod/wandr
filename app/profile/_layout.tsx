import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="overview" options={{ title: 'Profile overview' }} />
    </Stack>
  );
}
