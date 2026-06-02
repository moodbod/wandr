import { lazy, Suspense } from 'react';

import { RouteLoading } from '@/components/route-loading';

const StaysMapScreen = lazy(() =>
  import('@/components/wandr/stays/stays-map-screen').then((m) => ({ default: m.StaysMapScreen }))
);

export default function StaysScreen() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <StaysMapScreen />
    </Suspense>
  );
}
