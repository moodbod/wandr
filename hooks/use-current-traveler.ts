import { useQuery } from 'convex/react';

import { getTravelerProfileRef } from '@/lib/convex';

export function useCurrentTraveler() {
  return useQuery(getTravelerProfileRef, {});
}
