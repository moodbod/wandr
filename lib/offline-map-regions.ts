import {
  defaultPlanningLocations,
  getPlanningLocationCenterCoordinate,
  type PlanningLocation,
} from '@/constants/planning-countries';

export type OfflineMapBounds = {
  maxLat: number;
  maxLng: number;
  minLat: number;
  minLng: number;
};

export type OfflineMapRegionKind = 'planning' | 'trip';

export type OfflineMapRegion = {
  bounds: OfflineMapBounds;
  centerCoordinate: readonly [number, number];
  detail: string;
  estimatedSizeLabel: string;
  id: string;
  kind: OfflineMapRegionKind;
  label: string;
  maxZoom: number;
  minZoom: number;
  nativeStyleUrl: string;
  version: string;
  webPack?: {
    manifestUrl: string;
    styleUrl: string;
  };
};

export const OFFLINE_MAP_PACK_VERSION = '2026.05.v1';
export const OFFLINE_MAP_CACHE_PREFIX = 'wandr-offline-map';
export const MAPBOX_STREETS_STYLE_URL = 'mapbox://styles/mapbox/streets-v12';
export const MAPBOX_DARK_STYLE_URL = 'mapbox://styles/mapbox/dark-v11';

const DEFAULT_MIN_ZOOM = 5;
const DEFAULT_MAX_ZOOM = 14;
const WEB_PACK_BASE_URL = '/offline-map-packs/regions';

export const offlineMapRegions: readonly OfflineMapRegion[] = defaultPlanningLocations
  .filter((location) => location.isSupported && location.bounds)
  .map((location) => createPlanningOfflineMapRegion(location));

export function createPlanningOfflineMapRegion(location: PlanningLocation): OfflineMapRegion {
  const bounds = location.bounds;
  if (!bounds) {
    throw new Error(`Planning location ${location.id} does not have offline map bounds.`);
  }
  const label = location.id === 'south-africa' ? 'South Africa / Cape Town' : location.label;

  return {
    bounds,
    centerCoordinate: getPlanningLocationCenterCoordinate(location) ?? getBoundsCenter(bounds),
    detail: `${label} map pack`,
    estimatedSizeLabel: location.id === 'namibia' ? 'Large' : 'Medium',
    id: location.id,
    kind: 'planning',
    label,
    maxZoom: DEFAULT_MAX_ZOOM,
    minZoom: DEFAULT_MIN_ZOOM,
    nativeStyleUrl: MAPBOX_DARK_STYLE_URL,
    version: OFFLINE_MAP_PACK_VERSION,
    webPack: {
      manifestUrl: `${WEB_PACK_BASE_URL}/${location.id}/metadata.json`,
      styleUrl: `${WEB_PACK_BASE_URL}/${location.id}/style.json`,
    },
  };
}

export function getOfflineMapRegionForPlanningLocation(location: PlanningLocation) {
  return offlineMapRegions.find((region) => region.id === location.id) ?? null;
}

export function createTripOfflineMapRegion({
  centerCoordinate,
  coordinates,
  tripId,
  tripName,
}: {
  centerCoordinate?: readonly [number, number] | null;
  coordinates: readonly (readonly [number, number])[];
  tripId?: string | null;
  tripName?: string | null;
}): OfflineMapRegion | null {
  const validCoordinates = coordinates.filter(isCoordinateValid);
  if (centerCoordinate && isCoordinateValid(centerCoordinate)) {
    validCoordinates.push(centerCoordinate);
  }

  if (validCoordinates.length === 0) {
    return null;
  }

  const rawBounds = validCoordinates.reduce<OfflineMapBounds>(
    (bounds, coordinate) => ({
      maxLat: Math.max(bounds.maxLat, coordinate[1]),
      maxLng: Math.max(bounds.maxLng, coordinate[0]),
      minLat: Math.min(bounds.minLat, coordinate[1]),
      minLng: Math.min(bounds.minLng, coordinate[0]),
    }),
    {
      maxLat: validCoordinates[0][1],
      maxLng: validCoordinates[0][0],
      minLat: validCoordinates[0][1],
      minLng: validCoordinates[0][0],
    }
  );
  const bounds = padBounds(rawBounds, 0.35);
  const fallbackId = `${Math.round(getBoundsCenter(bounds)[0] * 1000)}-${Math.round(getBoundsCenter(bounds)[1] * 1000)}`;
  const id = `trip-${tripId ?? fallbackId}`;

  return {
    bounds,
    centerCoordinate: centerCoordinate && isCoordinateValid(centerCoordinate) ? centerCoordinate : getBoundsCenter(bounds),
    detail: 'Trip map pack',
    estimatedSizeLabel: 'Trip area',
    id,
    kind: 'trip',
    label: `${tripName || 'Trip'} offline map`,
    maxZoom: 15,
    minZoom: 6,
    nativeStyleUrl: MAPBOX_DARK_STYLE_URL,
    version: OFFLINE_MAP_PACK_VERSION,
  };
}

export function getOfflineMapPackName(region: OfflineMapRegion) {
  return `${OFFLINE_MAP_CACHE_PREFIX}-${region.version}-${region.id}`;
}

export function coordinateInOfflineMapRegion(
  coordinate: readonly [number, number] | null | undefined,
  region: OfflineMapRegion
) {
  if (!coordinate || !isCoordinateValid(coordinate)) {
    return false;
  }

  const [longitude, latitude] = coordinate;
  return (
    longitude >= region.bounds.minLng &&
    longitude <= region.bounds.maxLng &&
    latitude >= region.bounds.minLat &&
    latitude <= region.bounds.maxLat
  );
}

export function findOfflineMapRegionForCoordinate(
  coordinate: readonly [number, number] | null | undefined,
  regions: readonly OfflineMapRegion[]
) {
  return regions.find((region) => coordinateInOfflineMapRegion(coordinate, region)) ?? null;
}

export function boundsToMapboxOfflineBounds(bounds: OfflineMapBounds): [[number, number], [number, number]] {
  return [
    [bounds.maxLng, bounds.maxLat],
    [bounds.minLng, bounds.minLat],
  ];
}

function getBoundsCenter(bounds: OfflineMapBounds): readonly [number, number] {
  return [
    (bounds.minLng + bounds.maxLng) / 2,
    (bounds.minLat + bounds.maxLat) / 2,
  ];
}

function padBounds(bounds: OfflineMapBounds, paddingDegrees: number): OfflineMapBounds {
  return {
    maxLat: Math.min(90, bounds.maxLat + paddingDegrees),
    maxLng: Math.min(180, bounds.maxLng + paddingDegrees),
    minLat: Math.max(-90, bounds.minLat - paddingDegrees),
    minLng: Math.max(-180, bounds.minLng - paddingDegrees),
  };
}

function isCoordinateValid(coordinate: readonly [number, number]) {
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
