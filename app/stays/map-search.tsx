import { lazy, Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const StaysMapScreen = lazy(() =>
  import('@/components/wandr/stays/stays-map-screen').then((module) => ({
    default: module.StaysMapScreen,
  }))
);

export default function StaysMapSearchScreen() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <StaysMapScreen showBack />
    </Suspense>
  );
}

function RouteLoading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color="#9fe870" />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#111217',
    flex: 1,
    justifyContent: 'center',
  },
});
