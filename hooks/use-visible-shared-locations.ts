import { useQuery } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';

import { listVisibleSharedLocationsRef, type SharedUserLocation } from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';
import { useShowOtherUsersLiveLocationSetting } from './use-current-user-settings';

const EMPTY_SHARED_LOCATIONS: readonly SharedUserLocation[] = [];
const SHARED_LOCATION_EXPIRY_TICK_MS = 15_000;
const SHARED_LOCATION_EXPIRY_GRACE_MS = 5_000;
const FALLBACK_SHARED_LOCATION_TTL_MS = 10 * 60 * 1000;

export function useVisibleSharedLocations() {
  const { session } = useAuthSession();
  const travelerSlug = session?.travelerSlug ?? null;
  const showOtherUsersLiveLocation = useShowOtherUsersLiveLocationSetting();
  const now = useSharedLocationClock(Boolean(travelerSlug && showOtherUsersLiveLocation));
  const locations = useQuery(
    listVisibleSharedLocationsRef,
    travelerSlug && showOtherUsersLiveLocation ? { travelerSlug } : 'skip'
  );

  return useMemo(() => {
    if (!locations || !travelerSlug || !showOtherUsersLiveLocation) {
      return EMPTY_SHARED_LOCATIONS;
    }

    return locations.filter(
      (location) => location.travelerSlug !== travelerSlug && isFreshSharedLocation(location, now)
    );
  }, [locations, now, travelerSlug, showOtherUsersLiveLocation]);
}

function useSharedLocationClock(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), SHARED_LOCATION_EXPIRY_TICK_MS);
    return () => clearInterval(timer);
  }, [enabled]);

  return now;
}

function isFreshSharedLocation(location: SharedUserLocation, now: number) {
  if (Number.isFinite(location.expiresAt)) {
    return location.expiresAt + SHARED_LOCATION_EXPIRY_GRACE_MS > now;
  }

  return location.updatedAt + FALLBACK_SHARED_LOCATION_TTL_MS > now;
}
