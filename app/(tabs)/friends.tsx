import { lazy, Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const FriendsTabScreen = lazy(() => import('@/components/wandr/friends/friends-tab-screen'));

export default function FriendsScreenRoute() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <FriendsTabScreen />
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
