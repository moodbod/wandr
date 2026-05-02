import type { PlanningLocation } from '@/constants/planning-countries';

type MapboxFeature = {
  id: string;
  text?: string;
  place_name?: string;
  center?: [number, number];
  bbox?: [number, number, number, number];
  context?: readonly { text?: string }[];
  properties?: {
    short_code?: string;
  };
};

type MapboxGeocodeResponse = {
  features?: MapboxFeature[];
};

export async function fetchMapboxLocationSuggestions({
  currentCoordinate,
  query,
  signal,
}: {
  currentCoordinate?: readonly [number, number] | null;
  query: string;
  signal?: AbortSignal;
}): Promise<PlanningLocation[]> {
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const trimmedQuery = query.trim();

  if (!token || trimmedQuery.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    access_token: token,
    autocomplete: 'true',
    language: 'en',
    limit: '6',
    types: 'country,region,place,locality,neighborhood,address,poi',
  });

  if (currentCoordinate) {
    params.set('proximity', `${currentCoordinate[0]},${currentCoordinate[1]}`);
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmedQuery)}.json?${params.toString()}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Mapbox geocoding failed with ${response.status}`);
  }

  const data = (await response.json()) as MapboxGeocodeResponse;

  return (data.features ?? []).flatMap((feature) => {
    if (!feature.center || !feature.place_name) {
      return [];
    }

    const detailParts = (feature.context ?? [])
      .map((item) => item.text)
      .filter((value): value is string => Boolean(value));
    const detail = detailParts.length > 0 ? detailParts.join(', ') : 'Map location';
    const bounds = feature.bbox
      ? {
          minLng: feature.bbox[0],
          minLat: feature.bbox[1],
          maxLng: feature.bbox[2],
          maxLat: feature.bbox[3],
        }
      : undefined;
    const aliases = [
      feature.text,
      feature.place_name,
      feature.properties?.short_code,
      ...detailParts,
    ].filter((value): value is string => Boolean(value));

    return [{
      id: `mapbox-${feature.id}`,
      label: feature.text ?? feature.place_name,
      detail,
      centerCoordinate: feature.center,
      bounds,
      radiusKm: bounds ? undefined : 80,
      isSupported: false,
      searchAliases: aliases.map((alias) => alias.toLowerCase()),
    }];
  });
}
