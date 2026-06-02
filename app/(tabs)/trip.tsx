import { lazy, Suspense } from 'react';

import { RouteLoading } from '@/components/route-loading';

const TripTabScreen = lazy(() => import('@/components/wandr/trip/trip-tab-screen'));

export default function TripScreenRoute() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <TripTabScreen />
    </Suspense>
  );
}
