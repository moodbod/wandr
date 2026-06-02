import { lazy, Suspense } from 'react';

import { RouteLoading } from '@/components/route-loading';

const FriendsTabScreen = lazy(() => import('@/components/wandr/friends/friends-tab-screen'));

export default function FriendsScreenRoute() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <FriendsTabScreen />
    </Suspense>
  );
}
