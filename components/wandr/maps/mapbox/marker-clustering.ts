import type { MapMarker, MapRegion, MarkerCluster, MarkerDisplayItem } from './types';

export function regionFromCoordinate(
  coordinate: readonly [number, number] | null,
  zoomLevel: number
): MapRegion {
  const delta = zoomLevel ? 180 / Math.pow(2, zoomLevel) : 0.1;

  return {
    latitude: coordinate?.[1] ?? 0,
    longitude: coordinate?.[0] ?? 0,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export function regionFromMapboxBounds(
  center: readonly number[],
  bounds: { ne: readonly number[]; sw: readonly number[] }
): MapRegion {
  const longitude = typeof center[0] === 'number' ? center[0] : 0;
  const latitude = typeof center[1] === 'number' ? center[1] : 0;
  const longitudeDelta = Math.max(Math.abs((bounds.ne[0] ?? longitude) - (bounds.sw[0] ?? longitude)), 0.0001);
  const latitudeDelta = Math.max(Math.abs((bounds.ne[1] ?? latitude) - (bounds.sw[1] ?? latitude)), 0.0001);

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

export function regionToZoomLevel(region: MapRegion) {
  const longitudeDelta = Math.max(region.longitudeDelta, 0.0001);
  return Math.log2(360 / longitudeDelta);
}

export function regionsAreClose(a: MapRegion, b: MapRegion) {
  return (
    Math.abs(a.latitude - b.latitude) < 0.00001 &&
    Math.abs(a.longitude - b.longitude) < 0.00001 &&
    Math.abs(a.latitudeDelta - b.latitudeDelta) < 0.00001 &&
    Math.abs(a.longitudeDelta - b.longitudeDelta) < 0.00001
  );
}

export function filterMarkersForZoom(markers: MapMarker[], zoomLevel: number) {
  if (markers.length <= 8 || zoomLevel >= 10.8) {
    return markers;
  }

  const visibleLimit =
    zoomLevel < 5.2
      ? 6
      : zoomLevel < 6.8
        ? 10
        : zoomLevel < 8.5
          ? 16
          : 24;

  const essentialMarkers = markers.filter((marker) => marker.status || marker.priceLabel);
  const essentialIds = new Set(essentialMarkers.map((marker) => marker.id));
  const rankedMarkers = markers
    .filter((marker) => !essentialIds.has(marker.id))
    .map((marker, index) => ({ marker, index }))
    .sort((a, b) => {
      const scoreDelta = (b.marker.popularityScore ?? 0) - (a.marker.popularityScore ?? 0);

      return scoreDelta === 0 ? a.index - b.index : scoreDelta;
    })
    .slice(0, Math.max(visibleLimit - essentialMarkers.length, 0))
    .map((item) => item.marker);
  const visibleIds = new Set([...essentialIds, ...rankedMarkers.map((marker) => marker.id)]);

  return markers.filter((marker) => visibleIds.has(marker.id));
}

export function buildMarkerDisplayItems(
  markers: MapMarker[],
  region: MapRegion,
  zoomLevel: number
): MarkerDisplayItem[] {
  if (markers.length < 7 || zoomLevel >= 10.8) {
    return markers.map((marker) => ({ kind: 'marker' as const, marker }));
  }

  const clusters = buildClusters(markers, region, zoomLevel);

  return clusters.flatMap<MarkerDisplayItem>((cluster) => {
    if (cluster.markers.length === 1 && zoomLevel >= 8.5) {
      return [{ kind: 'marker' as const, marker: cluster.markers[0] }];
    }

    return [{ kind: 'cluster' as const, cluster }];
  });
}

function buildClusters(markers: MapMarker[], region: MapRegion, zoomLevel: number): MarkerCluster[] {
  const clustersByKey = new Map<string, MapMarker[]>();

  markers.forEach((marker) => {
    const key = gridClusterKey(marker, region, zoomLevel);
    const bucket = clustersByKey.get(key) ?? [];

    bucket.push(marker);
    clustersByKey.set(key, bucket);
  });

  return Array.from(clustersByKey.entries()).map(([key, clusterMarkers]) => ({
    id: key,
    coordinate: averageCoordinate(clusterMarkers),
    count: clusterMarkers.length,
    markers: clusterMarkers,
  }));
}

function gridClusterKey(marker: MapMarker, region: MapRegion, zoomLevel: number) {
  const [longitude, latitude] = marker.coordinate;
  const viewportSpan = Math.max(region.longitudeDelta, region.latitudeDelta);
  const cellSize =
    zoomLevel < 5
      ? viewportSpan / 2
      : zoomLevel < 7
        ? viewportSpan / 3
        : zoomLevel < 9.5
          ? viewportSpan / 4
          : Math.max(viewportSpan / 6, 0.68);
  const normalizedLongitude = longitude - region.longitude;
  const normalizedLatitude = latitude - region.latitude;

  return `grid:${cellSize}:${Math.floor(normalizedLongitude / cellSize)}:${Math.floor(normalizedLatitude / cellSize)}`;
}

function averageCoordinate(markers: MapMarker[]): readonly [number, number] {
  const total = markers.reduce(
    (acc, marker) => ({
      longitude: acc.longitude + marker.coordinate[0],
      latitude: acc.latitude + marker.coordinate[1],
    }),
    { longitude: 0, latitude: 0 }
  );

  return [total.longitude / markers.length, total.latitude / markers.length];
}
