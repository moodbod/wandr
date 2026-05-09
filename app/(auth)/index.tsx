import { Redirect, useLocalSearchParams } from 'expo-router';

export default function AuthIndex() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  return <Redirect href={{ pathname: '/(auth)/sign-in', params }} />;
}
