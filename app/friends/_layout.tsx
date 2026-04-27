import { Stack } from 'expo-router';

export default function FriendsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="discover" options={{ title: 'Friends discovery' }} />
      <Stack.Screen name="chat" options={{ title: 'Friends chat' }} />
    </Stack>
  );
}
