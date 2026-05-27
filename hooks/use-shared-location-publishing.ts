import { useMutation } from 'convex/react';
import { useEffect } from 'react';

import { clearSharedLocationRef, publishSharedLocationRef } from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';
import { useCurrentLocationSharingSetting } from './use-current-user-settings';

type CurrentLocationSnapshot = {
  accuracy: number | null;
  coordinate: readonly [number, number] | null;
  hasPermission: boolean;
  heading?: number | null;
  isStale?: boolean;
  speed?: number | null;
};
type LocationSharingSetting = 'off' | 'whileUsing' | 'tripOnly';

const MIN_SYNC_INTERVAL_MS = 30_000;
const MIN_SYNC_MOVE_METERS = 20;

const lastSyncByTraveler = new Map<
  string,
  {
    coordinate: readonly [number, number];
    syncedAt: number;
  }
>();
const clearedTravelers = new Set<string>();
const unavailableClearedTravelers = new Set<string>();

export function useSharedLocationPublishing(location: CurrentLocationSnapshot) {
  const currentLocationSharing = useCurrentLocationSharingSetting();

  useSharedLocationPublishingForSetting(location, currentLocationSharing);
}

export function useSharedLocationPublishingForSetting(
  location: CurrentLocationSnapshot,
  locationSharing: LocationSharingSetting | undefined
) {
  const { session } = useAuthSession();
  const publishSharedLocation = useMutation(publishSharedLocationRef);
  const clearSharedLocation = useMutation(clearSharedLocationRef);
  const travelerSlug = session?.travelerSlug ?? null;

  useEffect(() => {
    if (!travelerSlug || !locationSharing) {
      return;
    }

    if (locationSharing === 'off') {
      if (!clearedTravelers.has(travelerSlug)) {
        clearedTravelers.add(travelerSlug);
        unavailableClearedTravelers.delete(travelerSlug);
        lastSyncByTraveler.delete(travelerSlug);
        void clearSharedLocation({ travelerSlug }).catch((error) => {
          clearedTravelers.delete(travelerSlug);
          console.error('Failed to clear shared location', error);
        });
      }
      return;
    }

    clearedTravelers.delete(travelerSlug);
    if (!location.hasPermission || location.isStale || !location.coordinate || !coordinateIsValid(location.coordinate)) {
      if (!unavailableClearedTravelers.has(travelerSlug)) {
        unavailableClearedTravelers.add(travelerSlug);
        lastSyncByTraveler.delete(travelerSlug);
        void clearSharedLocation({ travelerSlug }).catch((error) => {
          unavailableClearedTravelers.delete(travelerSlug);
          console.error('Failed to clear unavailable shared location', error);
        });
      }
      return;
    }

    unavailableClearedTravelers.delete(travelerSlug);
    const now = Date.now();
    const lastSync = lastSyncByTraveler.get(travelerSlug);
    if (
      lastSync &&
      now - lastSync.syncedAt < MIN_SYNC_INTERVAL_MS &&
      getDistanceMeters(lastSync.coordinate, location.coordinate) < MIN_SYNC_MOVE_METERS
    ) {
      return;
    }

    const coordinate: [number, number] = [location.coordinate[0], location.coordinate[1]];
    lastSyncByTraveler.set(travelerSlug, {
      coordinate,
      syncedAt: now,
    });

    void publishSharedLocation({
      travelerSlug,
      coordinate,
      accuracy: location.accuracy ?? undefined,
      heading: normalizeHeading(location.heading) ?? undefined,
      speed: normalizeSpeed(location.speed) ?? undefined,
    }).catch((error) => {
      lastSyncByTraveler.delete(travelerSlug);
      console.error('Failed to publish shared location', error);
    });
  }, [
    clearSharedLocation,
    location.accuracy,
    location.coordinate,
    location.hasPermission,
    location.heading,
    location.isStale,
    location.speed,
    locationSharing,
    publishSharedLocation,
    travelerSlug,
  ]);
}

function coordinateIsValid(coordinate: readonly [number, number]) {
  const [longitude, latitude] = coordinate;
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function normalizeHeading(heading: number | null | undefined) {
  if (typeof heading !== 'number' || !Number.isFinite(heading) || heading < 0) {
    return null;
  }

  return ((heading % 360) + 360) % 360;
}

function normalizeSpeed(speed: number | null | undefined) {
  return typeof speed === 'number' && Number.isFinite(speed) && speed >= 0 ? speed : null;
}

function getDistanceMeters(a: readonly [number, number], b: readonly [number, number]) {
  const earthRadiusMeters = 6_371_000;
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const deltaLat = toRadians(b[1] - a[1]);
  const deltaLon = toRadians(b[0] - a[0]);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
