import 'mapbox-gl/dist/mapbox-gl.css';

import type mapboxgl from 'mapbox-gl';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WandrAvatar } from '@/components/wandr/avatar';
import { designSystem } from '@/constants/design-system';
import { defaultPlanningLocation, getPlanningLocationCenterCoordinate } from '@/constants/planning-countries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchRoutePath } from '@/lib/routing';

import type { MapMarker, MapPreviewProps } from './mapbox/types';

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null;
const DEFAULT_MAP_CENTER: readonly [number, number] =
  getPlanningLocationCenterCoordinate(defaultPlanningLocation) ?? [17.0832, -22.5597];

type MapboxModule = typeof mapboxgl;
type RenderedMapMarker = {
  marker: mapboxgl.Marker;
  root?: Root;
};

function MapPreviewWebComponent({
  centerCoordinate,
  userCoordinate = null,
  userAvatarPaletteKey,
  userAvatarUri,
  userHeading = null,
  userName,
  viewportPadding,
  markers = [],
  routeCoordinates,
  zoomLevel = 14,
  showRoutes = true,
  recenterToUserSignal = 0,
  colorSchemeMode = 'system',
  markerVariant = 'default',
  onInteract,
  onMapPress,
  onMarkerPress,
  style,
}: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<RenderedMapMarker[]>([]);
  const onInteractRef = useRef(onInteract);
  const onMapPressRef = useRef(onMapPress);
  const hasCenteredOnResolvedDataRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const lastCameraTargetKeyRef = useRef<string | null>(null);
  const initialMapConfigRef = useRef<{
    centerCoordinate: readonly [number, number];
    isDark: boolean;
    zoomLevel: number;
  }>({
    centerCoordinate: DEFAULT_MAP_CENTER,
    isDark: false,
    zoomLevel,
  });
  const [mapbox, setMapbox] = useState<MapboxModule | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [upcomingRouteCoords, setUpcomingRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [stayBranchCoords, setStayBranchCoords] = useState<Record<string, { latitude: number; longitude: number }[]>>({});
  const colorScheme = useColorScheme();
  const isDark = colorSchemeMode === 'dark' || (colorSchemeMode === 'system' && colorScheme === 'dark');
  const fallbackBackgroundColor = isDark ? designSystem.colors.darkBackground : designSystem.colors.mapFallback;
  const fallbackTextColor = isDark ? designSystem.colors.darkMutedText : designSystem.colors.warmDark;
  const cameraPadding = useMemo(() => normalizeCameraPadding(viewportPadding), [viewportPadding]);
  const normalizedMarkers = useMemo(() => normalizeMarkers(markers), [markers]);
  const resolvedCenterCoordinate = centerCoordinate ?? userCoordinate ?? normalizedMarkers[0]?.coordinate ?? null;
  const mapCenterCoordinate = resolvedCenterCoordinate ?? DEFAULT_MAP_CENTER;
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
    onInteractRef.current = onInteract;
  }, [onInteract]);

  useEffect(() => {
    onMapPressRef.current = onMapPress;
  }, [onMapPress]);

  useEffect(() => {
    initialMapConfigRef.current = {
      centerCoordinate: mapCenterCoordinate,
      isDark,
      zoomLevel,
    };
  }, [isDark, mapCenterCoordinate, zoomLevel]);

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
    const initialConfig = initialMapConfigRef.current;

    if (!mapbox || !containerRef.current || mapRef.current) {
      return;
    }

    const map = new mapbox.Map({
      accessToken: MAPBOX_ACCESS_TOKEN ?? undefined,
      attributionControl: false,
      center: initialConfig.centerCoordinate as [number, number],
      container: containerRef.current,
      bearing: 0,
      dragRotate: false,
      logoPosition: 'bottom-left',
      pitch: 0,
      pitchWithRotate: false,
      style: initialConfig.isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
      touchPitch: false,
      zoom: initialConfig.zoomLevel,
    });

    mapRef.current = map;
    map.addControl(new mapbox.NavigationControl({ showCompass: false }), 'top-right');
    const handleUserInteract = () => {
      hasUserInteractedRef.current = true;
      onInteractRef.current?.();
    };
    map.on('dragstart', handleUserInteract);
    map.on('zoomstart', handleUserInteract);
    map.on('click', (event) => {
      onMapPressRef.current?.([event.lngLat.lng, event.lngLat.lat]);
      handleUserInteract();
    });

    let hasLoaded = false;
    let resizeFrame: number | null = null;
    const resizeMap = () => {
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }

      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;

        if (!hasLoaded || mapRef.current !== map || !containerRef.current?.isConnected) {
          return;
        }

        map.resize();
      });
    };
    map.on('load', () => {
      hasLoaded = true;
      setIsMapReady(true);
      resizeMap();
    });
    const resizeObserver = new ResizeObserver(resizeMap);
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', resizeMap);

    return () => {
      hasLoaded = false;
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }
      window.removeEventListener('resize', resizeMap);
      resizeObserver.disconnect();
      clearRenderedMarkers(markerRefs.current);
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [mapbox]);

  useEffect(() => {
    if (!mapRef.current || !isMapReady) {
      return;
    }

    mapRef.current.setStyle(isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12');
  }, [isDark, isMapReady]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const cameraTargetKey = getCameraTargetKey(mapCenterCoordinate, zoomLevel);
    if (cameraTargetKey === lastCameraTargetKeyRef.current) {
      return;
    }

    if (
      hasUserInteractedRef.current &&
      !centerCoordinate &&
      resolvedCenterCoordinate &&
      hasCenteredOnResolvedDataRef.current
    ) {
      return;
    }

    lastCameraTargetKeyRef.current = cameraTargetKey;
    hasUserInteractedRef.current = false;
    mapRef.current.easeTo({
      bearing: 0,
      center: mapCenterCoordinate as [number, number],
      duration: 650,
      padding: cameraPadding,
      pitch: 0,
      zoom: zoomLevel,
    });
    if (resolvedCenterCoordinate) {
      hasCenteredOnResolvedDataRef.current = true;
    }
  }, [cameraPadding, centerCoordinate, mapCenterCoordinate, resolvedCenterCoordinate, zoomLevel]);

  useEffect(() => {
    if (!mapRef.current || !userCoordinate || recenterToUserSignal === 0) {
      return;
    }

    lastCameraTargetKeyRef.current = getCameraTargetKey(userCoordinate, 17);
    hasUserInteractedRef.current = false;
    mapRef.current.easeTo({
      bearing: userHeading ?? 0,
      center: userCoordinate as [number, number],
      duration: 650,
      padding: cameraPadding,
      pitch: 0,
      zoom: 17,
    });
  }, [cameraPadding, recenterToUserSignal, userCoordinate, userHeading]);

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

    clearRenderedMarkers(markerRefs.current);
    markerRefs.current = [];

    normalizedMarkers.forEach((mapMarker) => {
      const element = createMarkerElement(mapMarker, isDark, markerVariant);
      const marker = new mapbox.Marker({
        anchor: mapMarker.priceLabel ? 'bottom' : 'center',
        element,
      })
        .setLngLat(mapMarker.coordinate as [number, number])
        .addTo(mapRef.current!);

      element.addEventListener('click', (event) => {
        event.stopPropagation();
        onMarkerPress?.(mapMarker);
      });

      markerRefs.current.push({ marker });
    });

    if (userCoordinate) {
      const { element, root } = createUserMarkerElement({
        avatarPaletteKey: userAvatarPaletteKey,
        avatarUri: userAvatarUri,
        isDark,
        name: userName,
      });
      const marker = new mapbox.Marker({ element }).setLngLat(userCoordinate as [number, number]).addTo(mapRef.current);
      markerRefs.current.push({ marker, root });
    }
  }, [isDark, isMapReady, mapbox, markerVariant, normalizedMarkers, onMarkerPress, userAvatarPaletteKey, userAvatarUri, userCoordinate, userName]);

  useEffect(() => {
    if (!mapRef.current || !isMapReady) {
      return;
    }

    const map = mapRef.current;
    let isCancelled = false;
    const upsertRoutes = () => {
      if (isCancelled || mapRef.current !== map || !map.isStyleLoaded()) {
        return;
      }

      upsertRouteLayer(map, 'upcoming-route', upcomingRouteCoords);
      Object.entries(stayBranchCoords).forEach(([id, coords]) => {
        upsertRouteLayer(map, `branch-${id}`, coords);
      });
    };
    const handleStyleReady = () => {
      if (map.isStyleLoaded()) {
        upsertRoutes();
      }
    };

    if (map.isStyleLoaded()) {
      upsertRoutes();
    } else {
      map.on('styledata', handleStyleReady);
      map.on('idle', handleStyleReady);
    }

    return () => {
      isCancelled = true;
      map.off('styledata', handleStyleReady);
      map.off('idle', handleStyleReady);
    };
  }, [isMapReady, stayBranchCoords, upcomingRouteCoords]);

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <View style={[styles.fallback, { backgroundColor: fallbackBackgroundColor }]}>
        <ThemedText style={[styles.fallbackTitle, { color: fallbackTextColor }]}>Mapbox needs an access token to render maps.</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.mapRoot, style]}>
      <div
        ref={containerRef}
        style={webMapStyle}
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

function normalizeCameraPadding(viewportPadding: MapPreviewProps['viewportPadding']) {
  return {
    bottom: viewportPadding?.paddingBottom ?? 0,
    left: viewportPadding?.paddingLeft ?? 0,
    right: viewportPadding?.paddingRight ?? 0,
    top: viewportPadding?.paddingTop ?? 0,
  };
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

function createUserMarkerElement({
  avatarPaletteKey,
  avatarUri,
  isDark,
  name,
}: {
  avatarPaletteKey?: string | null;
  avatarUri?: string | null;
  isDark: boolean;
  name?: string | null;
}) {
  const element = document.createElement('div');
  element.style.cssText = [
    'width:50px',
    'height:50px',
    'border-radius:999px',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    `background:${isDark ? designSystem.colors.darkBackground : designSystem.colors.white}`,
    'box-shadow:0 8px 14px rgba(0,0,0,0.18)',
    'overflow:hidden',
  ].join(';');

  const root = createRoot(element);
  root.render(
    <WandrAvatar
      name={name}
      paletteKey={avatarPaletteKey}
      size={42}
      uri={avatarUri}
    />
  );

  return { element, root };
}

function clearRenderedMarkers(markers: RenderedMapMarker[]) {
  markers.forEach(({ marker, root }) => {
    root?.unmount();
    marker.remove();
  });
}

function upsertRouteLayer(
  map: mapboxgl.Map,
  id: string,
  coordinates: readonly { latitude: number; longitude: number }[]
) {
  if (!map.isStyleLoaded()) {
    return;
  }

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
    if (!map.getLayer(layerId) && coordinates.length > 0) {
      addRouteLineLayer(map, layerId, sourceId);
    }
    return;
  }

  if (coordinates.length === 0) {
    return;
  }

  map.addSource(sourceId, { type: 'geojson', data });
  addRouteLineLayer(map, layerId, sourceId);
}

function addRouteLineLayer(map: mapboxgl.Map, layerId: string, sourceId: string) {
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

function getCameraTargetKey(coordinate: readonly [number, number], zoomLevel: number) {
  return `${coordinate[0].toFixed(6)},${coordinate[1].toFixed(6)}:${zoomLevel}`;
}

const webMapStyle = {
  width: '125%',
  height: '125%',
  outline: 'none',
  border: 'none',
  position: 'absolute',
  top: 0,
  left: 0,
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
