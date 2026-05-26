import { lazy, Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const TripTabScreen = lazy(() => import('@/components/wandr/trip/trip-tab-screen'));

export default function TripScreenRoute() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <TripTabScreen />
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
