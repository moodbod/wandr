import { Stack } from 'expo-router';

export default function SquadLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="discover" options={{ title: 'Squad discovery' }} />
      <Stack.Screen name="chat" options={{ title: 'Squad chat' }} />
    </Stack>
  );
}
