import {
  coordinateIsInPlanningLocation,
  defaultPlanningLocations,
  type PlanningLocation,
} from '@/constants/planning-countries';
import type { TripListItem } from '@/types/trip';

function getTripCountrySortKey(trip: TripListItem, selectedLocation: PlanningLocation) {
  if (coordinateIsInPlanningLocation(trip.centerCoordinate, selectedLocation)) {
    return {
      rank: 0,
      label: selectedLocation.label,
    };
  }

  const matchedLocation = defaultPlanningLocations.find((location) =>
    coordinateIsInPlanningLocation(trip.centerCoordinate, location)
  );

  if (matchedLocation) {
    return {
      rank: 1,
      label: matchedLocation.label,
    };
  }

  return {
    rank: 2,
    label: 'Other',
  };
}

export function orderTripsByPlanningCountry(
  trips: readonly TripListItem[],
  selectedLocation: PlanningLocation
) {
  return [...trips].sort((a, b) => {
    const aCountry = getTripCountrySortKey(a, selectedLocation);
    const bCountry = getTripCountrySortKey(b, selectedLocation);

    if (aCountry.rank !== bCountry.rank) {
      return aCountry.rank - bCountry.rank;
    }

    const labelSort = aCountry.label.localeCompare(bCountry.label);
    if (labelSort !== 0) {
      return labelSort;
    }

    return b.createdAt - a.createdAt;
  });
}
