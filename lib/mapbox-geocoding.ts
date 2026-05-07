import type { PlanningLocation } from '@/constants/planning-countries';

type MapboxSearchBoxFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    address?: string;
    feature_type?: string;
    full_address?: string;
    mapbox_id?: string;
    name?: string;
    name_preferred?: string;
    place_formatted?: string;
    context?: Record<string, { name?: string; country_code?: string; region_code?: string } | undefined>;
  };
};

type MapboxSearchBoxResponse = {
  features?: MapboxSearchBoxFeature[];
};

type OpenStreetMapSearchResult = {
  address?: Record<string, string | undefined>;
  class?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
  osm_id?: number;
  osm_type?: string;
  type?: string;
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

  if (trimmedQuery.length < 2) {
    return [];
  }

  const openStreetMapSuggestions = await fetchOpenStreetMapSuggestions({ query: trimmedQuery, signal });
  if (openStreetMapSuggestions.length > 0) {
    return openStreetMapSuggestions;
  }

  if (!token) {
    return [];
  }

  const params = new URLSearchParams({
    access_token: token,
    language: 'en',
    limit: '10',
  });

  if (currentCoordinate) {
    params.set('proximity', `${currentCoordinate[0]},${currentCoordinate[1]}`);
  }

  const url = `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(trimmedQuery)}&${params.toString()}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Mapbox Search Box failed with ${response.status}`);
  }

  const data = (await response.json()) as MapboxSearchBoxResponse;

  return (data.features ?? []).flatMap((feature) => {
    const coordinate = feature.geometry?.coordinates;
    const properties = feature.properties;
    if (!coordinate || !properties?.name) {
      return [];
    }

    const contextParts = Object.values(properties.context ?? {})
      .map((item) => item?.name)
      .filter((value): value is string => Boolean(value));
    const detail = properties.full_address ?? properties.place_formatted ?? contextParts.join(', ') ?? 'Map location';
    const aliases = [
      properties.name,
      properties.name_preferred,
      properties.full_address,
      properties.place_formatted,
      properties.address,
      properties.feature_type,
      ...contextParts,
    ].filter((value): value is string => Boolean(value));

    return [{
      id: `mapbox-${properties.mapbox_id ?? `${coordinate[0]},${coordinate[1]}`}`,
      label: properties.name_preferred ?? properties.name,
      detail,
      centerCoordinate: coordinate,
      radiusKm: 80,
      isSupported: false,
      searchAliases: aliases.map((alias) => alias.toLowerCase()),
    }];
  });
}

async function fetchOpenStreetMapSuggestions({
  query,
  signal,
}: {
  query: string;
  signal?: AbortSignal;
}): Promise<PlanningLocation[]> {
  const params = new URLSearchParams({
    addressdetails: '1',
    format: 'jsonv2',
    limit: '10',
    q: query,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { signal });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as OpenStreetMapSearchResult[];

  return data.flatMap((result) => {
    const longitude = Number(result.lon);
    const latitude = Number(result.lat);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return [];
    }

    const addressParts = [
      result.address?.house_number && result.address?.road ? `${result.address.house_number} ${result.address.road}` : result.address?.road,
      result.address?.suburb ?? result.address?.neighbourhood ?? result.address?.quarter,
      result.address?.city ?? result.address?.town ?? result.address?.village,
      result.address?.state,
      result.address?.country,
    ].filter((value): value is string => Boolean(value));
    const label = result.name || result.address?.road || result.display_name?.split(',')[0]?.trim() || 'OpenStreetMap result';
    const detail = result.display_name ?? (addressParts.join(', ') || 'OpenStreetMap location');
    const aliases = [
      result.name,
      result.display_name,
      result.type,
      result.class,
      ...addressParts,
    ].filter((value): value is string => Boolean(value));

    return [{
      id: `osm-${result.osm_type ?? 'node'}-${result.osm_id ?? `${longitude},${latitude}`}`,
      label,
      detail,
      centerCoordinate: [longitude, latitude] as const,
      radiusKm: 80,
      isSupported: false,
      searchAliases: aliases.map((alias) => alias.toLowerCase()),
    }];
  });
}
