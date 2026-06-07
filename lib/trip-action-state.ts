import {
  destinationMatchesPlanningLocation,
  getPlanningLocationForCoordinate,
} from '@/constants/planning-countries';
import type { TripListItem } from '@/types/trip';

export type TripActionKind = 'experienceRequest' | 'placeSave';

export type TripActionPrimaryAction = 'createTrip' | 'openPicker' | 'usePreferredTrip';

type TripActionDestination = {
  coordinate?: readonly [number, number] | null;
  countryCode?: string | null;
  countryLabel?: string | null;
  labels?: readonly (string | null | undefined)[];
  locationLabel?: string | null;
  planningLocationId?: string | null;
  title: string;
};

export type TripActionState = {
  cardSubtitle: string;
  cardTitle: string;
  newTripName: string;
  preferredTrip?: TripListItem;
  primaryAction: TripActionPrimaryAction;
  primaryLabel: string;
  secondaryLabel?: string;
  sheetSubtitle?: string;
  sheetTitle: string;
};

export function getTripActionState({
  destination,
  isAlreadyAdded = false,
  kind,
  trips,
}: {
  destination: TripActionDestination;
  isAlreadyAdded?: boolean;
  kind: TripActionKind;
  trips: readonly TripListItem[];
}): TripActionState {
  const preferredTrip = getPreferredTripForDestination(destination, trips);
  const hasTrips = trips.length > 0;
  const newTripName = getTripStarterName(destination);

  if (kind === 'experienceRequest') {
    return {
      cardTitle: isAlreadyAdded
        ? 'Request another time'
        : preferredTrip
          ? `Plan this with ${preferredTrip.name}`
          : hasTrips
            ? 'Add this to a trip'
            : 'Start a trip from here',
      cardSubtitle: isAlreadyAdded
        ? 'This experience is already in a trip. You can request another date or add it to a different trip.'
        : preferredTrip
          ? 'We found a trip in this location. Confirm the request details before adding it.'
          : hasTrips
            ? 'Choose the trip and request details in one step.'
            : `We will create "${newTripName}" and add this experience.`,
      newTripName,
      preferredTrip,
      primaryAction: hasTrips ? 'openPicker' : 'createTrip',
      primaryLabel: hasTrips ? (isAlreadyAdded ? 'Request again' : 'Request') : 'Start trip',
      secondaryLabel: hasTrips ? 'New trip' : undefined,
      sheetSubtitle: preferredTrip
        ? `Suggested: ${preferredTrip.name}`
        : hasTrips
          ? 'Choose where this experience belongs.'
          : undefined,
      sheetTitle: 'Request experience',
    };
  }

  return {
    cardTitle: preferredTrip
      ? `Save to ${preferredTrip.name}`
      : hasTrips
        ? 'Save this place to a trip'
        : 'Start a trip from here',
    cardSubtitle: preferredTrip
      ? 'This place matches one of your active trip locations.'
      : hasTrips
        ? 'Choose the trip where this stop belongs.'
        : `We will create "${newTripName}" and save this place.`,
    newTripName,
    preferredTrip,
    primaryAction: preferredTrip ? 'usePreferredTrip' : hasTrips ? 'openPicker' : 'createTrip',
    primaryLabel: hasTrips ? 'Add to trip' : 'Start trip',
    secondaryLabel: preferredTrip && trips.length > 1 ? 'Choose another' : undefined,
    sheetSubtitle: preferredTrip
      ? `Suggested: ${preferredTrip.name}`
      : hasTrips
        ? 'Choose where this place belongs.'
        : undefined,
    sheetTitle: 'Add to trip',
  };
}

function getPreferredTripForDestination(
  destination: TripActionDestination,
  trips: readonly TripListItem[]
) {
  return trips.find((trip) => {
    const tripLocation = getPlanningLocationForCoordinate(trip.centerCoordinate);
    if (!tripLocation) {
      return false;
    }

    return destinationMatchesPlanningLocation({
      coordinate: destination.coordinate,
      countryCode: destination.countryCode,
      countryLabel: destination.countryLabel,
      labels: [
        destination.title,
        destination.locationLabel,
        ...(destination.labels ?? []),
      ],
      location: tripLocation,
      planningLocationId: destination.planningLocationId,
    });
  });
}

function getTripStarterName(destination: TripActionDestination) {
  const baseLabel =
    destination.locationLabel?.split(',')[0]?.trim() ||
    destination.countryLabel?.trim() ||
    destination.title.trim() ||
    'New';

  return baseLabel.toLowerCase().endsWith('trip') ? baseLabel : `${baseLabel} Trip`;
}
