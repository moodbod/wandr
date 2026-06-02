import type { RankedStayProperty } from '@/types/stays';

const NEAR_ROUTE_RADIUS_KM = 90;
const NEAR_ME_RADIUS_KM = 60;

export function filterStaysByDiscoveryMode(
  {
    currentCoordinate,
    discoveryMode,
    routeCoordinates,
    stays,
  }: {
    currentCoordinate?: readonly [number, number] | null;
    discoveryMode: 'route' | 'nearby';
    routeCoordinates: readonly (readonly [number, number])[];
    stays: readonly RankedStayProperty[];
  }
) {
  const radius = discoveryMode === 'nearby' ? NEAR_ME_RADIUS_KM : NEAR_ROUTE_RADIUS_KM;
  const getDistance =
    discoveryMode === 'nearby'
      ? (stay: RankedStayProperty) => getDistanceFromCurrent(stay, currentCoordinate)
      : (stay: RankedStayProperty) => getDistanceFromRoute(stay, routeCoordinates);
  const hasUsableDistance = stays.some((stay) => Number.isFinite(getDistance(stay)));

  if (!hasUsableDistance) {
    return [...stays];
  }

  const rankedByDistance = [...stays].sort((a, b) => {
    return getDistance(a) - getDistance(b);
  });

  return rankedByDistance.filter((stay) => getDistance(stay) <= radius);
}

export function getStaySearchText(stay: RankedStayProperty) {
  return [
    stay.name,
    stay.locationLabel,
    stay.town,
    stay.region,
    stay.countryLabel,
    stay.stayStyle,
    stay.routeVibe,
    stay.sleepSignal,
    stay.summary,
    stay.bookingNote,
    stay.idealFor.join(' '),
    stay.amenities.join(' '),
    stay.nearbyHighlights.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function getDistanceFromCurrent(
  stay: RankedStayProperty,
  currentCoordinate?: readonly [number, number] | null
) {
  return currentCoordinate ? getDistanceInKm(stay.coordinate, currentCoordinate) : Number.POSITIVE_INFINITY;
}

export function getDistanceFromRoute(
  stay: RankedStayProperty,
  routeCoordinates: readonly (readonly [number, number])[]
) {
  if (routeCoordinates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (routeCoordinates.length === 1) {
    return getDistanceInKm(stay.coordinate, routeCoordinates[0]);
  }

  return routeCoordinates.slice(0, -1).reduce((bestDistance, start, index) => {
    const end = routeCoordinates[index + 1];
    return Math.min(bestDistance, getDistanceToRouteSegmentKm(stay.coordinate, start, end));
  }, Number.POSITIVE_INFINITY);
}

function getDistanceToRouteSegmentKm(
  coordinate: readonly [number, number],
  start: readonly [number, number],
  end: readonly [number, number]
) {
  const latitudeScale = 111.32;
  const referenceLatitude = toRadians((coordinate[1] + start[1] + end[1]) / 3);
  const longitudeScale = Math.max(Math.cos(referenceLatitude) * latitudeScale, 0.0001);
  const point = toXY(coordinate, longitudeScale, latitudeScale);
  const segmentStart = toXY(start, longitudeScale, latitudeScale);
  const segmentEnd = toXY(end, longitudeScale, latitudeScale);
  const segmentX = segmentEnd.x - segmentStart.x;
  const segmentY = segmentEnd.y - segmentStart.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return getDistanceInKm(coordinate, start);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - segmentStart.x) * segmentX + (point.y - segmentStart.y) * segmentY) / segmentLengthSquared
    )
  );
  const projection = {
    x: segmentStart.x + t * segmentX,
    y: segmentStart.y + t * segmentY,
  };

  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

function toXY(coordinate: readonly [number, number], longitudeScale: number, latitudeScale: number) {
  return {
    x: coordinate[0] * longitudeScale,
    y: coordinate[1] * latitudeScale,
  };
}

function getDistanceInKm(from: readonly [number, number], to: readonly [number, number]) {
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

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
