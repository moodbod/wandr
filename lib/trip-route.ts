import type { TripDashboard, TripDashboardItem } from '@/types/trip';

type RouteCoordinateOptions = {
  currentCoordinate?: readonly [number, number] | null;
  onlyRemaining?: boolean;
};

export function buildTripRouteCoordinates(
  trip: Pick<TripDashboard, 'activeIndex' | 'items'> | null | undefined,
  options: RouteCoordinateOptions = {}
): readonly (readonly [number, number])[] {
  if (!trip) {
    return [];
  }

  const startIndex = options.onlyRemaining ? Math.max(trip.activeIndex, 0) : 0;
  const routeItems = trip.items.slice(startIndex);
  const coordinates = routeItems
    .map(getTripItemCoordinate)
    .filter((coordinate): coordinate is readonly [number, number] => isCoordinate(coordinate));
  const routeCoordinates =
    options.currentCoordinate && coordinates.length > 0
      ? [options.currentCoordinate, ...coordinates]
      : coordinates;

  return dedupeConsecutiveCoordinates(routeCoordinates);
}

function getTripItemCoordinate(item: TripDashboardItem) {
  return item.stay?.coordinate ?? item.experience.coordinate ?? null;
}

function isCoordinate(coordinate: readonly number[] | null | undefined): coordinate is readonly [number, number] {
  return (
    Array.isArray(coordinate) &&
    coordinate.length === 2 &&
    Number.isFinite(coordinate[0]) &&
    Number.isFinite(coordinate[1])
  );
}

function dedupeConsecutiveCoordinates(coordinates: readonly (readonly [number, number])[]) {
  return coordinates.filter((coordinate, index, all) => {
    const previous = all[index - 1];

    return !previous || previous[0] !== coordinate[0] || previous[1] !== coordinate[1];
  });
}
