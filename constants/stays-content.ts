import type { TripDashboard } from '@/types/trip';
import type { RankedStayProperty, StayProperty } from '@/types/stays';

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getDistanceInKm(from: readonly [number, number], to: readonly [number, number]) {
  const earthRadiusKm = 6371;
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRouteStops(trip?: TripDashboard | null) {
  return (
    trip?.items
      .filter(
        (item): item is TripDashboard['items'][number] & {
          experience: TripDashboard['items'][number]['experience'] & {
            coordinate: readonly [number, number];
          };
        } => Array.isArray(item.experience.coordinate) && item.experience.coordinate.length === 2
      )
      .map((item) => ({
        label: item.experience.locationLabel ?? item.experience.title,
        coordinate: item.experience.coordinate,
      })) ?? []
  );
}

export function rankStayProperties(args: {
  stays?: readonly StayProperty[];
  trip?: TripDashboard | null;
  currentCoordinate?: readonly [number, number] | null;
}) {
  const routeStops = getRouteStops(args.trip);
  const sourceStays = args.stays ?? [];

  return [...sourceStays]
    .map<RankedStayProperty>((stay) => {
      const closestStop = routeStops.reduce((best, stop) => {
        const distance = getDistanceInKm(stay.coordinate, stop.coordinate);
        if (!best || distance < best.distance) {
          return { stop, distance };
        }
        return best;
      }, null as { stop: { label: string; coordinate: readonly [number, number] }; distance: number } | null);

      const distanceFromCurrentKm = args.currentCoordinate
        ? getDistanceInKm(stay.coordinate, args.currentCoordinate)
        : null;
      const routeScore = closestStop?.distance ?? Number.POSITIVE_INFINITY;
      const currentScore = distanceFromCurrentKm ?? Number.POSITIVE_INFINITY;
      const matchScore = Math.min(routeScore, currentScore);

      return {
        ...stay,
        distanceFromRouteKm: routeScore,
        distanceFromCurrentKm,
        matchScore,
        ...(closestStop
          ? {
              matchedStopLabel: closestStop.stop.label,
              matchedStopCoordinate: closestStop.stop.coordinate,
            }
          : null),
      };
    })
    .sort((a, b) => a.matchScore - b.matchScore);
}

export function formatDistance(distanceKm: number) {
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }

  return `${Math.round(distanceKm)} km`;
}
