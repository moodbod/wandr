import 'mapbox-gl/dist/mapbox-gl.css';

import type mapboxgl from 'mapbox-gl';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { fetchRoutePath } from '@/lib/routing';

import {
  buildMarkerDisplayItems,
  filterMarkersForZoom,
  regionFromCoordinate,
  regionFromMapboxBounds,
  regionToZoomLevel,
} from './mapbox/marker-clustering';
import type { MapMarker, MapPreviewProps, MapRegion } from './mapbox/types';

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null;

type MapboxModule = typeof mapboxgl;

function MapPreviewWebComponent({
  centerCoordinate,
  userCoordinate = null,
  markers = [],
  routeCoordinates,
  zoomLevel = 14,
  showRoutes = true,
  colorSchemeMode = 'system',
  markerVariant = 'default',
  onInteract,
  onMarkerPress,
  style,
}: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);
  const [mapbox, setMapbox] = useState<MapboxModule | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [upcomingRouteCoords, setUpcomingRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [stayBranchCoords, setStayBranchCoords] = useState<Record<string, { latitude: number; longitude: number }[]>>({});
  const [visibleRegion, setVisibleRegion] = useState<MapRegion | null>(null);
  const colorScheme = useColorScheme();
  const { isLargeScreen } = useResponsive();
  const isDark = colorSchemeMode === 'dark' || (colorSchemeMode === 'system' && colorScheme === 'dark');
  const fallbackBackgroundColor = isDark ? designSystem.colors.darkBackground : designSystem.colors.mapFallback;
  const fallbackTextColor = isDark ? designSystem.colors.darkMutedText : designSystem.colors.warmDark;
  const normalizedMarkers = useMemo(() => normalizeMarkers(markers), [markers]);
  const resolvedCenterCoordinate = centerCoordinate ?? userCoordinate ?? normalizedMarkers[0]?.coordinate ?? null;
  const region = useMemo(
    () => regionFromCoordinate(resolvedCenterCoordinate, zoomLevel),
    [resolvedCenterCoordinate, zoomLevel]
  );
  const effectiveRegion = visibleRegion ?? region;
  const effectiveZoomLevel = useMemo(() => regionToZoomLevel(effectiveRegion), [effectiveRegion]);
  const visibleMarkers = useMemo(
    () => filterMarkersForZoom(normalizedMarkers, effectiveZoomLevel),
    [effectiveZoomLevel, normalizedMarkers]
  );
  const markerDisplayItems = useMemo(
    () => buildMarkerDisplayItems(visibleMarkers, effectiveRegion, effectiveZoomLevel),
    [effectiveRegion, effectiveZoomLevel, visibleMarkers]
  );
  const stayMarkers = useMemo(
    () => normalizedMarkers.filter((marker) => marker.itemKind === 'stay' || !!marker.priceLabel),
    [normalizedMarkers]
  );
  const routeMarkerCoordinates = useMemo(
    () => routeCoordinates ?? normalizedMarkers.filter((marker) => !marker.priceLabel).map((marker) => marker.coordinate),
    [normalizedMarkers, routeCoordinates]
  );
  const routeMarkersKey = useMemo(
    () => routeMarkerCoordinates.map((coord) => `${coord[0]},${coord[1]}`).join('|'),
    [routeMarkerCoordinates]
  );
  const shouldHideMainRouteForStayFocus = useMemo(
    () => stayMarkers.length === 1 && stayMarkers[0].status === 'active',
    [stayMarkers]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadMapbox() {
      const module = await import('mapbox-gl');
      if (!cancelled) {
        module.default.accessToken = MAPBOX_ACCESS_TOKEN ?? '';
        setMapbox(() => module.default);
      }
    }

    if (MAPBOX_ACCESS_TOKEN) {
      void loadMapbox();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapbox || !containerRef.current || mapRef.current || !resolvedCenterCoordinate) {
      return;
    }

    const map = new mapbox.Map({
      accessToken: MAPBOX_ACCESS_TOKEN ?? undefined,
      attributionControl: false,
      center: resolvedCenterCoordinate as [number, number],
      container: containerRef.current,
      logoPosition: 'bottom-left',
      pitchWithRotate: true,
      style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/outdoors-v12',
      zoom: zoomLevel,
    });

    mapRef.current = map;
    map.addControl(new mapbox.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => setIsMapReady(true));
    map.on('dragstart', () => onInteract?.());
    map.on('zoomstart', () => onInteract?.());
    map.on('moveend', () => setVisibleRegion(mapToRegion(map)));

    const resizeMap = () => {
      map.resize();
    };
    const resizeObserver = new ResizeObserver(resizeMap);
    resizeObserver.observe(containerRef.current);
    requestAnimationFrame(resizeMap);
    window.addEventListener('resize', resizeMap);

    return () => {
      window.removeEventListener('resize', resizeMap);
      resizeObserver.disconnect();
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [isDark, mapbox, onInteract, resolvedCenterCoordinate, zoomLevel]);

  useEffect(() => {
    if (!mapRef.current || !resolvedCenterCoordinate) {
      return;
    }

    mapRef.current.easeTo({
      center: resolvedCenterCoordinate as [number, number],
      duration: 650,
      zoom: zoomLevel,
    });
  }, [resolvedCenterCoordinate, zoomLevel]);

  useEffect(() => {
    if (!showRoutes || routeMarkerCoordinates.length === 0 || shouldHideMainRouteForStayFocus) {
      setUpcomingRouteCoords([]);
      return;
    }

    let isCancelled = false;
    async function loadRoutes() {
      const routeInput: readonly (readonly [number, number])[] = routeCoordinates
        ? routeMarkerCoordinates
        : userCoordinate
          ? [userCoordinate, ...routeMarkerCoordinates]
          : routeMarkerCoordinates;

      if (routeInput.length <= 1) {
        setUpcomingRouteCoords([]);
        return;
      }

      const coords = await fetchRoutePath(routeInput);
      if (!isCancelled) {
        setUpcomingRouteCoords(coords);
      }
    }

    void loadRoutes();
    return () => {
      isCancelled = true;
    };
  }, [routeCoordinates, routeMarkerCoordinates, routeMarkersKey, shouldHideMainRouteForStayFocus, showRoutes, userCoordinate]);

  useEffect(() => {
    if (!showRoutes || stayMarkers.length === 0 || !userCoordinate) {
      setStayBranchCoords({});
      return;
    }

    let isCancelled = false;
    const currentUserCoordinate = userCoordinate;
    async function loadStayBranches() {
      const branches: Record<string, { latitude: number; longitude: number }[]> = {};

      for (const stay of stayMarkers) {
        if (stay.status === 'active' || stay.status === 'upcoming') {
          const branchPath = await fetchRoutePath([currentUserCoordinate, stay.coordinate]);
          if (branchPath.length > 1) {
            branches[stay.id] = branchPath;
          }
        }
      }

      if (!isCancelled) {
        setStayBranchCoords(branches);
      }
    }

    void loadStayBranches();
    return () => {
      isCancelled = true;
    };
  }, [stayMarkers, showRoutes, userCoordinate]);

  useEffect(() => {
    if (!mapbox || !mapRef.current || !isMapReady) {
      return;
    }

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    markerDisplayItems.forEach((displayItem) => {
      const element =
        displayItem.kind === 'cluster'
          ? createClusterElement(displayItem.cluster.count, isDark)
          : createMarkerElement(displayItem.marker, isDark, markerVariant);
      const coordinate = displayItem.kind === 'cluster' ? displayItem.cluster.coordinate : displayItem.marker.coordinate;
      const marker = new mapbox.Marker({
        anchor: displayItem.kind === 'marker' && displayItem.marker.priceLabel ? 'bottom' : 'center',
        element,
      })
        .setLngLat(coordinate as [number, number])
        .addTo(mapRef.current!);

      element.addEventListener('click', (event) => {
        event.stopPropagation();
        if (displayItem.kind === 'cluster') {
          onInteract?.();
          mapRef.current?.easeTo({
            center: displayItem.cluster.coordinate as [number, number],
            duration: 650,
            zoom: Math.min(14, Math.max(effectiveZoomLevel + 2.4, 8.5)),
          });
        } else {
          onMarkerPress?.(displayItem.marker);
        }
      });

      markerRefs.current.push(marker);
    });

    if (userCoordinate) {
      const element = document.createElement('div');
      element.style.cssText = [
        'width:18px',
        'height:18px',
        'border-radius:999px',
        `background:${designSystem.colors.lime}`,
        `border:3px solid ${designSystem.colors.white}`,
        'box-shadow:0 6px 16px rgba(0,0,0,0.28)',
      ].join(';');
      markerRefs.current.push(
        new mapbox.Marker({ element }).setLngLat(userCoordinate as [number, number]).addTo(mapRef.current)
      );
    }
  }, [effectiveZoomLevel, isDark, isMapReady, mapbox, markerDisplayItems, markerVariant, onInteract, onMarkerPress, userCoordinate]);

  useEffect(() => {
    if (!mapRef.current || !isMapReady) {
      return;
    }

    upsertRouteLayer(mapRef.current, 'upcoming-route', upcomingRouteCoords);
    Object.entries(stayBranchCoords).forEach(([id, coords]) => {
      upsertRouteLayer(mapRef.current!, `branch-${id}`, coords);
    });
  }, [isMapReady, stayBranchCoords, upcomingRouteCoords]);

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <View style={[styles.fallback, { backgroundColor: fallbackBackgroundColor }]}>
        <ThemedText style={[styles.fallbackTitle, { color: fallbackTextColor }]}>Mapbox needs an access token to render maps.</ThemedText>
      </View>
    );
  }

  if (!resolvedCenterCoordinate) {
    return (
      <View style={[styles.fallback, { backgroundColor: fallbackBackgroundColor }]}>
        <ThemedText style={[styles.fallbackTitle, { color: fallbackTextColor }]}>Map data is still loading.</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.mapRoot, style]}>
      <div
        ref={containerRef}
        style={isLargeScreen ? { ...webMapStyle, ...desktopWebMapStyle } : webMapStyle}
      />
    </View>
  );
}

export const MapPreview = memo(MapPreviewWebComponent);
export type { MapMarker, MapPreviewProps };

function normalizeMarkers(markers: readonly MapMarker[]) {
  const seen = new Set<string>();

  return markers.filter((marker) => {
    const [longitude, latitude] = marker.coordinate;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return false;
    }

    const dedupeKey = `${marker.id}:${longitude}:${latitude}:${marker.priceLabel ?? ''}:${marker.status ?? ''}`;
    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}

function mapToRegion(map: mapboxgl.Map): MapRegion {
  const center = map.getCenter();
  const bounds = map.getBounds();

  if (!bounds) {
    return regionFromCoordinate([center.lng, center.lat], map.getZoom());
  }

  return regionFromMapboxBounds([center.lng, center.lat], {
    ne: [bounds.getNorthEast().lng, bounds.getNorthEast().lat],
    sw: [bounds.getSouthWest().lng, bounds.getSouthWest().lat],
  });
}

function createMarkerElement(marker: MapMarker, isDark: boolean, variant: MapPreviewProps['markerVariant']) {
  const element = document.createElement('button');
  const isActive = marker.status === 'active';
  const isFaded = marker.status === 'completed';

  element.type = 'button';
  element.setAttribute('aria-label', marker.label ?? marker.priceLabel ?? 'Map marker');
  element.style.cssText = [
    'appearance:none',
    'border:0',
    'background:transparent',
    'padding:0',
    'cursor:pointer',
    `opacity:${isFaded ? 0.5 : 1}`,
    'transform:translateY(-2px)',
  ].join(';');

  if (marker.priceLabel) {
    element.innerHTML = `<span style="
      display:block;
      min-width:64px;
      padding:6px 12px;
      border-radius:12px;
      font:600 13px/16px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color:${isActive ? designSystem.colors.darkGreen : marker.tone === 'dark' ? designSystem.colors.white : designSystem.colors.ink};
      background:${isActive ? designSystem.colors.lime : marker.tone === 'dark' ? designSystem.colors.darkOliveGlass : designSystem.colors.whiteGlassBright};
      border:1.5px solid ${isActive ? designSystem.colors.darkGreen : marker.tone === 'dark' ? designSystem.colors.whiteOverlayThin : designSystem.colors.blackWash};
      box-shadow:0 4px 8px rgba(0,0,0,0.10);
      text-align:center;
      transform:${isActive ? 'scale(1.1)' : 'scale(1)'};
    ">${escapeHtml(marker.priceLabel)}</span>`;
    return element;
  }

  const size = variant === 'routeWidget' ? 28 : 42;
  const borderColor = isDark ? designSystem.colors.whiteOverlayBorder : designSystem.colors.white;
  const fallbackColor = marker.tone === 'dark' ? designSystem.colors.darkGreen : designSystem.colors.copper;
  element.innerHTML = `<span style="
    display:block;
    width:${size}px;
    height:${size}px;
    border-radius:${size / 2}px;
    overflow:hidden;
    background:${fallbackColor};
    border:3px solid ${borderColor};
    box-shadow:0 8px 14px rgba(0,0,0,0.18);
  ">${marker.imageUri ? `<img src="${escapeHtml(marker.imageUri)}" alt="" style="width:100%;height:100%;object-fit:cover;" />` : ''}</span>`;

  return element;
}

function createClusterElement(count: number, isDark: boolean) {
  const element = document.createElement('button');
  element.type = 'button';
  element.setAttribute('aria-label', `${count} places`);
  element.textContent = String(count);
  element.style.cssText = [
    'appearance:none',
    'min-width:58px',
    'height:58px',
    'border-radius:29px',
    'padding:0 10px',
    `background:${isDark ? designSystem.colors.warmDark : designSystem.colors.lime}`,
    `border:3px solid ${isDark ? designSystem.colors.whiteOverlayBorder : designSystem.colors.white}`,
    `color:${isDark ? designSystem.colors.lime : designSystem.colors.darkGreen}`,
    'box-shadow:0 8px 14px rgba(0,0,0,0.18)',
    'cursor:pointer',
    'font:600 18px/21px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  ].join(';');
  return element;
}

function upsertRouteLayer(
  map: mapboxgl.Map,
  id: string,
  coordinates: readonly { latitude: number; longitude: number }[]
) {
  const sourceId = `${id}-source`;
  const layerId = `${id}-line`;
  const data = {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: coordinates.map((coordinate) => [coordinate.longitude, coordinate.latitude]),
    },
    properties: {},
  };
  const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;

  if (existingSource) {
    existingSource.setData(data);
    return;
  }

  if (coordinates.length === 0) {
    return;
  }

  map.addSource(sourceId, { type: 'geojson', data });
  map.addLayer({
    id: layerId,
    source: sourceId,
    type: 'line',
    paint: {
      'line-color': designSystem.colors.lime,
      'line-dasharray': [2.5, 2],
      'line-width': 4,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const webMapStyle = {
  width: '100%',
  height: '100%',
  outline: 'none',
  border: 'none',
  position: 'absolute',
  top: 0,
  left: 0,
} satisfies React.CSSProperties;

const desktopWebMapStyle = {
  width: '125%',
  height: '125%',
} satisfies React.CSSProperties;

const styles = StyleSheet.create({
  mapRoot: {
    flex: 1,
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  fallbackTitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
});
