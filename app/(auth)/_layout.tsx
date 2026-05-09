import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen
        name="sign-in"
        options={{ title: 'Sign In | Wandr' }}
      />
      <Stack.Screen
        name="sign-up"
        options={{ title: 'Sign Up | Wandr' }}
      />
      <Stack.Screen
        name="onboarding"
        options={{
          title: 'Welcome | Wandr',
          gestureEnabled: false,
          animation: 'fade',
        }}
      />
    </Stack>
  );
}
