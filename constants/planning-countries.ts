type LocationBounds = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

export type PlanningLocation = {
  id: string;
  label: string;
  detail: string;
  countryCode?: string;
  countryLabel?: string;
  centerCoordinate?: readonly [number, number];
  bounds?: LocationBounds;
  radiusKm?: number;
  isSupported?: boolean;
  searchAliases: readonly string[];
};

export const defaultPlanningLocations: readonly PlanningLocation[] = [
  {
    id: 'namibia',
    label: 'Namibia',
    detail: 'Windhoek, coast, desert, safari routes',
    countryCode: 'NA',
    countryLabel: 'Namibia',
    centerCoordinate: [17.0832, -22.5609],
    bounds: {
      minLng: 11.7,
      maxLng: 25.3,
      minLat: -29.2,
      maxLat: -16.8,
    },
    searchAliases: [
      'namibia',
      'windhoek',
      'khomas',
      'erongo',
      'swakopmund',
      'walvis bay',
      'etosha',
      'sossusvlei',
      'hardap',
      'kunene',
      'oshikoto',
    ],
    isSupported: true,
  },
  {
    id: 'south-africa',
    label: 'South Africa',
    detail: 'Cape Town, Winelands, coast, safari starts',
    countryCode: 'ZA',
    countryLabel: 'South Africa',
    centerCoordinate: [18.4241, -33.9249],
    bounds: {
      minLng: 17.6,
      maxLng: 20.2,
      minLat: -34.9,
      maxLat: -32.6,
    },
    searchAliases: [
      'south africa',
      'za',
      'cape town',
      'western cape',
      'table mountain',
      'waterfront',
      'kirstenbosch',
      'stellenbosch',
      'franschhoek',
      'garden route',
      'kruger',
    ],
    isSupported: true,
  },
];

export const defaultPlanningLocation = defaultPlanningLocations[0];

export function createPlanningLocationFromInput(input: string): PlanningLocation | null {
  const label = input.trim().replace(/\s+/g, ' ');
  if (!label) {
    return null;
  }

  return {
    id: `custom-${label.toLowerCase()}`,
    label,
    detail: 'Custom planning location',
    searchAliases: [label.toLowerCase()],
  };
}

export function getPlanningLocationForCoordinate(
  coordinate?: readonly [number, number] | null
): PlanningLocation | null {
  if (!coordinate) {
    return null;
  }

  return defaultPlanningLocations.find((location) => coordinateIsInPlanningLocation(coordinate, location)) ?? null;
}

export function coordinateIsInPlanningLocation(
  coordinate: readonly [number, number] | null | undefined,
  location: PlanningLocation
) {
  if (!coordinate || !location.bounds) {
    return false;
  }

  const [lng, lat] = coordinate;
  const { bounds, centerCoordinate, radiusKm } = location;

  if (!bounds && centerCoordinate && radiusKm) {
    return getDistanceInKm(coordinate, centerCoordinate) <= radiusKm;
  }

  if (!bounds) {
    return false;
  }

  return lng >= bounds.minLng && lng <= bounds.maxLng && lat >= bounds.minLat && lat <= bounds.maxLat;
}

export function labelsMatchPlanningLocation(
  labels: readonly (string | null | undefined)[],
  location: PlanningLocation
) {
  const text = labels.filter(Boolean).join(' ').toLowerCase();
  if (!text) {
    return false;
  }

  return location.searchAliases.some((alias) => text.includes(alias));
}

export function getPlanningLocationForCountry({
  countryCode,
  countryLabel,
  planningLocationId,
}: {
  countryCode?: string | null;
  countryLabel?: string | null;
  planningLocationId?: string | null;
}) {
  const normalizedCountryCode = countryCode?.trim().toUpperCase();
  const normalizedCountryLabel = countryLabel?.trim().toLowerCase();

  return defaultPlanningLocations.find((location) => {
    if (planningLocationId && location.id === planningLocationId) {
      return true;
    }

    if (normalizedCountryCode && location.countryCode === normalizedCountryCode) {
      return true;
    }

    return Boolean(normalizedCountryLabel && location.countryLabel?.toLowerCase() === normalizedCountryLabel);
  }) ?? null;
}

export function getPlanningLocationMetadataForDestination({
  coordinate,
  labels = [],
  region,
  town,
}: {
  coordinate?: readonly number[] | null;
  labels?: readonly (string | null | undefined)[];
  region?: string | null;
  town?: string | null;
}) {
  const resolvedCoordinate =
    coordinate && coordinate.length >= 2
      ? ([coordinate[0], coordinate[1]] as const)
      : null;
  const location =
    getPlanningLocationForCoordinate(resolvedCoordinate) ??
    defaultPlanningLocations.find((candidate) =>
      labelsMatchPlanningLocation([region, town, ...labels], candidate)
    ) ??
    null;

  return location
    ? {
        countryCode: location.countryCode,
        countryLabel: location.countryLabel ?? location.label,
        planningLocationId: location.id,
      }
    : {};
}

export function destinationMatchesPlanningLocation({
  coordinate,
  countryCode,
  countryLabel,
  location,
  labels = [],
  planningLocationId,
}: {
  coordinate?: readonly [number, number] | null;
  countryCode?: string | null;
  countryLabel?: string | null;
  location: PlanningLocation;
  labels?: readonly (string | null | undefined)[];
  planningLocationId?: string | null;
}) {
  const locationFromCountry = getPlanningLocationForCountry({
    countryCode,
    countryLabel,
    planningLocationId,
  });

  if (locationFromCountry) {
    return locationFromCountry.id === location.id;
  }

  return coordinateIsInPlanningLocation(coordinate, location) || labelsMatchPlanningLocation(labels, location);
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
