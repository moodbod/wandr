import 'mapbox-gl/dist/mapbox-gl.css';

import type mapboxgl from 'mapbox-gl';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UserLocationPuck } from '@/components/wandr/maps/user-location-puck';
import { designSystem } from '@/constants/design-system';
import { defaultPlanningLocation, getPlanningLocationCenterCoordinate } from '@/constants/planning-countries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOfflineMapStyleUrl } from '@/hooks/use-offline-map-downloads';
import { fetchRoutePath } from '@/lib/routing';

import type { MapMarker, MapPreviewProps } from './mapbox/types';

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null;
const MAPBOX_STREET_STYLE_URL = 'mapbox://styles/mapbox/streets-v12';
const HIDDEN_MAPBOX_LAYER_KEYWORDS = ['poi', 'transit', 'airport', 'housenum', 'building', 'landmark'];
const DEFAULT_MAP_CENTER: readonly [number, number] =
  getPlanningLocationCenterCoordinate(defaultPlanningLocation) ?? [17.0832, -22.5597];

type MapboxModule = typeof mapboxgl;
type MapboxStyleLayer = mapboxgl.Layer & { 'source-layer'?: string };
type RenderedMapMarker = {
  marker: mapboxgl.Marker;
  root?: Root;
};
type PersistentMapState = {
  currentMapStyleURL: string | null;
  hasCenteredOnResolvedData: boolean;
  hasUserInteracted: boolean;
  host: HTMLDivElement;
  hideTimer: number | null;
  isFollowingUser: boolean;
  isReady: boolean;
  lastCameraTargetKey: string | null;
  map: mapboxgl.Map | null;
  placeMarkers: RenderedMapMarker[];
  userMarker: RenderedMapMarker | null;
};

const persistentMaps = new Map<string, PersistentMapState>();
let mapboxModulePromise: Promise<MapboxModule> | null = null;

function preloadMapboxModule() {
  if (!MAPBOX_ACCESS_TOKEN || typeof window === 'undefined') {
    return null;
  }

  if (!mapboxModulePromise) {
    mapboxModulePromise = import('mapbox-gl').then((module) => {
      module.default.accessToken = MAPBOX_ACCESS_TOKEN ?? '';
      return module.default;
    });
  }

  return mapboxModulePromise;
}

void preloadMapboxModule();

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
  followUserLocation = false,
  colorSchemeMode = 'system',
  interactionEnabled = true,
  markerVariant = 'default',
  persistKey,
  onInteract,
  onMapPress,
  onMarkerPress,
  style,
}: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const placeMarkerRefs = useRef<RenderedMapMarker[]>([]);
  const userMarkerRef = useRef<RenderedMapMarker | null>(null);
  const onInteractRef = useRef(onInteract);
  const onMapPressRef = useRef(onMapPress);
  const hasCenteredOnResolvedDataRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const isFollowingUserRef = useRef(followUserLocation);
  const currentMapStyleURLRef = useRef<string | null>(null);
  const lastCameraTargetKeyRef = useRef<string | null>(null);
  const initialMapConfigRef = useRef<{
    centerCoordinate: readonly [number, number];
    mapStyleURL: string;
    zoomLevel: number;
  }>({
    centerCoordinate: DEFAULT_MAP_CENTER,
    mapStyleURL: MAPBOX_STREET_STYLE_URL,
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
  const offlineMapState = useOfflineMapStyleUrl(mapCenterCoordinate);
  const mapStyleURL = offlineMapState.styleUrl ?? MAPBOX_STREET_STYLE_URL;
  const initialCenterCoordinate = followUserLocation && userCoordinate ? userCoordinate : mapCenterCoordinate;
  const followZoomLevel = Math.max(zoomLevel, 17);
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
    if (!followUserLocation) {
      isFollowingUserRef.current = false;
      return;
    }

    if (!hasUserInteractedRef.current) {
      isFollowingUserRef.current = true;
    }
  }, [followUserLocation]);

  useEffect(() => {
    initialMapConfigRef.current = {
      centerCoordinate: initialCenterCoordinate,
      mapStyleURL,
      zoomLevel,
    };
  }, [initialCenterCoordinate, mapStyleURL, zoomLevel]);

  useEffect(() => {
    let cancelled = false;

    async function loadMapbox() {
      const module = await preloadMapboxModule();
      if (!cancelled) {
        setMapbox(() => module);
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
    const persistentState = persistKey ? getPersistentMapState(persistKey) : null;

    if (!mapbox || !containerRef.current || mapRef.current) {
      return;
    }

    const isReusingPersistentMap = Boolean(persistentState?.map);
    const mapHost = persistentState?.host ?? document.createElement('div');
    if (persistentState) {
      attachPersistentMapHost(persistentState, containerRef.current);
    } else {
      applyEmbeddedMapHostStyle(mapHost);
      containerRef.current.appendChild(mapHost);
    }

    const map =
      persistentState?.map ??
      new mapbox.Map({
        accessToken: MAPBOX_ACCESS_TOKEN ?? undefined,
        attributionControl: false,
        center: initialConfig.centerCoordinate as [number, number],
        container: mapHost,
        bearing: 0,
        dragRotate: false,
        interactive: interactionEnabled,
        logoPosition: 'bottom-left',
        pitch: 0,
        pitchWithRotate: false,
        style: initialConfig.mapStyleURL,
        touchPitch: false,
        zoom: initialConfig.zoomLevel,
      });

    mapRef.current = map;
    if (persistentState) {
      hasCenteredOnResolvedDataRef.current = persistentState.hasCenteredOnResolvedData;
      hasUserInteractedRef.current = persistentState.hasUserInteracted;
      isFollowingUserRef.current = followUserLocation ? persistentState.isFollowingUser || !persistentState.hasUserInteracted : false;
      placeMarkerRefs.current = persistentState.placeMarkers;
      userMarkerRef.current = persistentState.userMarker;
      lastCameraTargetKeyRef.current = isReusingPersistentMap
        ? getCameraTargetKey(mapCenterCoordinate, zoomLevel)
        : persistentState.lastCameraTargetKey;
    }
    currentMapStyleURLRef.current = persistentState?.currentMapStyleURL ?? initialConfig.mapStyleURL;
    const handleUserInteract = () => {
      hasUserInteractedRef.current = true;
      isFollowingUserRef.current = false;
      onInteractRef.current?.();
    };
    const handleMapClick = (event: mapboxgl.MapMouseEvent) => {
      onMapPressRef.current?.([event.lngLat.lng, event.lngLat.lat]);
      handleUserInteract();
    };
    map.on('dragstart', handleUserInteract);
    map.on('zoomstart', handleUserInteract);
    map.on('rotatestart', handleUserInteract);
    map.on('pitchstart', handleUserInteract);
    map.on('click', handleMapClick);

    let hasLoaded = Boolean(persistentState?.isReady) || map.loaded();
    let resizeFrame: number | null = null;
    let resizeTimers: number[] = [];
    const resizeMap = () => {
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }

      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;

        if (!hasLoaded || mapRef.current !== map || !mapHost.isConnected) {
          return;
        }

        if (persistentState) {
          applyPersistentMapHostStyle(mapHost);
        }
        hideMapboxControls(mapHost);
        map.resize();
        if (!interactionEnabled) {
          map.jumpTo({
            bearing: 0,
            center: mapCenterCoordinate as [number, number],
            padding: cameraPadding,
            pitch: 0,
            zoom: zoomLevel,
          });
        }
      });
    };
    const resizeMapAfterLayout = () => {
      resizeMap();
      resizeTimers.forEach((timer) => window.clearTimeout(timer));
      resizeTimers = [80, 220, 420].map((delay) => window.setTimeout(resizeMap, delay));
    };
    const handleMapLoad = () => {
      hasLoaded = true;
      if (persistentState) {
        persistentState.isReady = true;
      }
      hideWebBaseMapDetails(map);
      setIsMapReady(true);
      resizeMapAfterLayout();
    };
    const handleStyleData = () => hideWebBaseMapDetails(map);
    const handleIdle = () => hideWebBaseMapDetails(map);
    map.on('load', handleMapLoad);
    map.on('styledata', handleStyleData);
    map.on('idle', handleIdle);
    const resizeObserver = new ResizeObserver(resizeMap);
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', resizeMap);
    if (hasLoaded) {
      hideWebBaseMapDetails(map);
      setIsMapReady(true);
      resizeMapAfterLayout();
    }

    return () => {
      hasLoaded = false;
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }
      resizeTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('resize', resizeMap);
      resizeObserver.disconnect();
      map.off('dragstart', handleUserInteract);
      map.off('zoomstart', handleUserInteract);
      map.off('rotatestart', handleUserInteract);
      map.off('pitchstart', handleUserInteract);
      map.off('click', handleMapClick);
      map.off('load', handleMapLoad);
      map.off('styledata', handleStyleData);
      map.off('idle', handleIdle);
      if (persistentState) {
        persistentState.currentMapStyleURL = currentMapStyleURLRef.current;
        persistentState.hasCenteredOnResolvedData = hasCenteredOnResolvedDataRef.current;
        persistentState.hasUserInteracted = hasUserInteractedRef.current;
        persistentState.isFollowingUser = isFollowingUserRef.current;
        persistentState.lastCameraTargetKey = lastCameraTargetKeyRef.current;
        persistentState.placeMarkers = placeMarkerRefs.current;
        persistentState.userMarker = userMarkerRef.current;
        persistentState.map = map;
        schedulePersistentMapHide(persistentState);
        mapRef.current = null;
        currentMapStyleURLRef.current = null;
        setIsMapReady(false);
        return;
      }
      clearRenderedMarkers(placeMarkerRefs.current);
      clearRenderedMarker(userMarkerRef.current);
      placeMarkerRefs.current = [];
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      currentMapStyleURLRef.current = null;
      setIsMapReady(false);
    };
  }, [cameraPadding, followUserLocation, interactionEnabled, mapCenterCoordinate, mapbox, persistKey, zoomLevel]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    setWebMapInteraction(mapRef.current, interactionEnabled);
  }, [interactionEnabled, isMapReady]);

  useEffect(() => {
    if (!mapRef.current || !isMapReady) {
      return;
    }

    if (currentMapStyleURLRef.current === mapStyleURL) {
      hideWebBaseMapDetails(mapRef.current);
      return;
    }

    currentMapStyleURLRef.current = mapStyleURL;
    mapRef.current.setStyle(mapStyleURL);
  }, [isMapReady, mapStyleURL]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (followUserLocation && userCoordinate && isFollowingUserRef.current) {
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
    mapRef.current.resize();
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
  }, [cameraPadding, centerCoordinate, followUserLocation, mapCenterCoordinate, resolvedCenterCoordinate, userCoordinate, zoomLevel]);

  useEffect(() => {
    if (!followUserLocation || !mapRef.current || !userCoordinate || !isFollowingUserRef.current) {
      return;
    }

    const cameraTargetKey = getCameraTargetKey(userCoordinate, followZoomLevel);
    if (cameraTargetKey === lastCameraTargetKeyRef.current) {
      return;
    }

    lastCameraTargetKeyRef.current = cameraTargetKey;
    hasUserInteractedRef.current = false;
    mapRef.current.resize();
    mapRef.current.easeTo({
      bearing: userHeading ?? 0,
      center: userCoordinate as [number, number],
      duration: 650,
      padding: cameraPadding,
      pitch: 0,
      zoom: followZoomLevel,
    });
  }, [cameraPadding, followUserLocation, followZoomLevel, userCoordinate, userHeading]);

  useEffect(() => {
    if (!mapRef.current || !userCoordinate || recenterToUserSignal === 0) {
      return;
    }

    isFollowingUserRef.current = true;
    lastCameraTargetKeyRef.current = getCameraTargetKey(userCoordinate, followZoomLevel);
    hasUserInteractedRef.current = false;
    mapRef.current.resize();
    mapRef.current.easeTo({
      bearing: userHeading ?? 0,
      center: userCoordinate as [number, number],
      duration: 650,
      padding: cameraPadding,
      pitch: 0,
      zoom: followZoomLevel,
    });
  }, [cameraPadding, followZoomLevel, recenterToUserSignal, userCoordinate, userHeading]);

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

    clearRenderedMarkers(placeMarkerRefs.current);
    placeMarkerRefs.current = [];

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

      placeMarkerRefs.current.push({ marker });
    });
  }, [isDark, isMapReady, mapbox, markerVariant, normalizedMarkers, onMarkerPress]);

  useEffect(() => {
    if (!mapbox || !mapRef.current || !isMapReady) {
      return;
    }

    if (!userCoordinate) {
      clearRenderedMarker(userMarkerRef.current);
      userMarkerRef.current = null;
      return;
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.marker.setLngLat(userCoordinate as [number, number]);
      userMarkerRef.current.root?.render(
        <UserLocationPuck
          avatarPaletteKey={userAvatarPaletteKey}
          avatarUri={userAvatarUri}
          heading={userHeading}
          name={userName}
        />
      );
      return;
    }

    const { element, root } = createUserMarkerElement({
      avatarPaletteKey: userAvatarPaletteKey,
      avatarUri: userAvatarUri,
      heading: userHeading,
      name: userName,
    });
    const marker = new mapbox.Marker({ element }).setLngLat(userCoordinate as [number, number]).addTo(mapRef.current);
    userMarkerRef.current = { marker, root };
  }, [isMapReady, mapbox, userAvatarPaletteKey, userAvatarUri, userCoordinate, userHeading, userName]);

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
        {offlineMapState.isOffline ? (
          <View pointerEvents="none" style={styles.offlineBanner}>
            <ThemedText style={styles.offlineBannerText}>
              {offlineMapState.styleUrl
                ? `Offline map: ${offlineMapState.region?.label ?? 'downloaded area'}`
                : offlineMapState.hasDownloadedRegion
                  ? 'Offline map needs an update'
                  : 'No downloaded map here'}
            </ThemedText>
          </View>
        ) : null}
    </View>
  );
}

export const MapPreview = memo(MapPreviewWebComponent);
export type { MapMarker, MapPreviewProps };

function hideWebBaseMapDetails(map: mapboxgl.Map) {
  if (!map.isStyleLoaded()) {
    return;
  }

  const layers = (map.getStyle().layers ?? []) as MapboxStyleLayer[];

  layers.forEach((layer) => {
    const sourceLayer = layer['source-layer']?.toLowerCase() ?? '';
    const layerId = layer.id.toLowerCase();
    const shouldHideLayer = HIDDEN_MAPBOX_LAYER_KEYWORDS.some(
      (keyword) => sourceLayer.includes(keyword) || layerId.includes(keyword)
    );

    if (!shouldHideLayer || !map.getLayer(layer.id)) {
      return;
    }

    try {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    } catch {
      // The style can change while Mapbox is settling; the next style event will retry.
    }
  });
}

function getPersistentMapState(key: string) {
  const existing = persistentMaps.get(key);
  if (existing) {
    return existing;
  }

  const state: PersistentMapState = {
    currentMapStyleURL: null,
    hasCenteredOnResolvedData: false,
    hasUserInteracted: false,
    host: document.createElement('div'),
    hideTimer: null,
    isFollowingUser: false,
    isReady: false,
    lastCameraTargetKey: null,
    map: null,
    placeMarkers: [],
    userMarker: null,
  };
  persistentMaps.set(key, state);

  return state;
}

function attachPersistentMapHost(state: PersistentMapState, container: HTMLDivElement) {
  if (state.hideTimer !== null) {
    window.clearTimeout(state.hideTimer);
    state.hideTimer = null;
  }

  applyPersistentMapHostStyle(state.host);
  if (state.host.parentElement !== container) {
    container.appendChild(state.host);
  }
}

function schedulePersistentMapHide(state: PersistentMapState) {
  if (state.hideTimer !== null) {
    window.clearTimeout(state.hideTimer);
    state.hideTimer = null;
  }

  parkPersistentMapHost(state.host);
}

function parkPersistentMapHost(host: HTMLDivElement) {
  const root = document.getElementById('root') ?? document.body;
  const hostStyle = host.style as CSSStyleDeclaration & { zoom?: string };

  if (host.parentElement !== root) {
    root.appendChild(host);
  }

  Object.assign(host.style, {
    ...webMapStyle,
    height: '1px',
    pointerEvents: 'none',
    position: 'fixed',
    visibility: 'hidden',
    width: '1px',
    zIndex: '-1',
  } satisfies React.CSSProperties);
  hostStyle.zoom = '';
}

function applyEmbeddedMapHostStyle(host: HTMLDivElement) {
  Object.assign(host.style, webMapStyle);
  hideMapboxControls(host);
}

function applyPersistentMapHostStyle(host: HTMLDivElement) {
  const rootZoom = getRootZoomScale();
  const hostStyle = host.style as CSSStyleDeclaration & { zoom?: string };

  Object.assign(host.style, {
    ...webMapStyle,
    bottom: 'auto',
    height: '100vh',
    pointerEvents: 'auto',
    position: 'absolute',
    right: 'auto',
    visibility: 'visible',
    width: '100vw',
    zIndex: '0',
  } satisfies React.CSSProperties);
  hostStyle.zoom = rootZoom === 1 ? '' : `${1 / rootZoom}`;
}

function getRootZoomScale() {
  const rootStyle = document.getElementById('root')?.style as (CSSStyleDeclaration & { zoom?: string }) | undefined;
  const zoom = Number.parseFloat(rootStyle?.zoom ?? '');

  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

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
  heading,
  name,
}: {
  avatarPaletteKey?: string | null;
  avatarUri?: string | null;
  heading?: number | null;
  name?: string | null;
}) {
  const element = document.createElement('div');
  element.style.cssText = [
    'width:58px',
    'height:58px',
    'border-radius:999px',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'overflow:hidden',
  ].join(';');

  const root = createRoot(element);
  root.render(
    <UserLocationPuck
      avatarPaletteKey={avatarPaletteKey}
      avatarUri={avatarUri}
      heading={heading}
      name={name}
    />
  );

  return { element, root };
}

function clearRenderedMarkers(markers: RenderedMapMarker[]) {
  markers.forEach(({ marker, root }) => {
    scheduleMarkerRootUnmount(root);
    marker.remove();
  });
}

function clearRenderedMarker(marker?: RenderedMapMarker | null) {
  if (!marker) {
    return;
  }

  scheduleMarkerRootUnmount(marker.root);
  marker.marker.remove();
}

function scheduleMarkerRootUnmount(root?: Root) {
  if (!root) {
    return;
  }

  window.setTimeout(() => {
    root.unmount();
  }, 0);
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

function hideMapboxControls(host: HTMLDivElement) {
  host.querySelectorAll<HTMLElement>('.mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib').forEach((element) => {
    element.style.display = 'none';
  });
}

function setWebMapInteraction(map: mapboxgl.Map, enabled: boolean) {
  const method = enabled ? 'enable' : 'disable';

  map.scrollZoom[method]();
  map.boxZoom[method]();
  map.dragPan[method]();
  map.keyboard[method]();
  map.doubleClickZoom[method]();
  map.touchZoomRotate[method]();
}

const webMapStyle = {
  bottom: 0,
  height: 'auto',
  left: 0,
  outline: 'none',
  border: 'none',
  position: 'absolute',
  right: 0,
  top: 0,
  width: 'auto',
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
  offlineBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    alignItems: 'center',
  },
  offlineBannerText: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: designSystem.colors.darkGreen,
    color: designSystem.colors.lime,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
