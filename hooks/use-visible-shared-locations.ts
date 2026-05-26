import { useQuery } from 'convex/react';
import { useMemo } from 'react';

import { listVisibleSharedLocationsRef, type SharedUserLocation } from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';

const EMPTY_SHARED_LOCATIONS: readonly SharedUserLocation[] = [];

export function useVisibleSharedLocations() {
  const { session } = useAuthSession();
  const locations = useQuery(
    listVisibleSharedLocationsRef,
    session?.travelerSlug ? { travelerSlug: session.travelerSlug } : 'skip'
  );

  return useMemo(() => {
    if (!locations || !session?.travelerSlug) {
      return EMPTY_SHARED_LOCATIONS;
    }

    return locations.filter((location) => location.travelerSlug !== session.travelerSlug);
  }, [locations, session?.travelerSlug]);
}
