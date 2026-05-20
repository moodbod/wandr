import type { Camera, MapView as MapboxMapView } from '@rnmapbox/maps';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { defaultPlanningLocation, getPlanningLocationCenterCoordinate } from '@/constants/planning-countries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchRoutePath } from '@/lib/routing';

import { MapboxPlaceMarker, MapboxUserMarker } from './mapbox/mapbox-marker';
import { getMapboxModule } from './mapbox/mapbox-module';
import { MapRouteOverlays } from './mapbox/mapbox-routes';
import type { MapMarker, MapPreviewProps } from './mapbox/types';

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null;
const DEFAULT_MAP_CENTER: readonly [number, number] =
  getPlanningLocationCenterCoordinate(defaultPlanningLocation) ?? [17.0832, -22.5597];
const HIDDEN_MAPBOX_SOURCE_LAYER_IDS = [
  'poi_label',
  'transit_stop_label',
  'airport_label',
  'housenum_label',
  'building',
  'landmark_label',
];

function MapPreviewComponent({
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
  const mapRef = useRef<MapboxMapView | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const hasSettledOnUserRef = useRef(false);
  const hasCenteredOnResolvedDataRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const lastCameraTargetKeyRef = useRef<string | null>(null);
  const [upcomingRouteCoords, setUpcomingRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [stayBranchCoords, setStayBranchCoords] = useState<Record<string, { latitude: number; longitude: number }[]>>({});
  const isWeb = Platform.OS === 'web';
  const MapboxGL = getMapboxModule();
  const colorScheme = useColorScheme();
  const isDark = colorSchemeMode === 'dark' || (colorSchemeMode === 'system' && colorScheme === 'dark');
  const fallbackBackgroundColor = isDark ? designSystem.colors.darkBackground : designSystem.colors.mapFallback;
  const fallbackTextColor = isDark ? designSystem.colors.darkMutedText : designSystem.colors.warmDark;
  const styleURL = MapboxGL
    ? isDark
      ? MapboxGL.StyleURL.Dark
      : MapboxGL.StyleURL.Street
    : null;
  const cameraPadding = useMemo(() => normalizeCameraPadding(viewportPadding), [viewportPadding]);
  const normalizedMarkers = useMemo(() => normalizeMarkers(markers), [markers]);
  const resolvedCenterCoordinate =
    centerCoordinate ?? userCoordinate ?? normalizedMarkers[0]?.coordinate ?? null;
  const mapCenterCoordinate = resolvedCenterCoordinate ?? DEFAULT_MAP_CENTER;
  const stayMarkers = useMemo(
    () => normalizedMarkers.filter((marker) => marker.itemKind === 'stay' || !!marker.priceLabel),
    [normalizedMarkers]
  );
  const routeMarkerCoordinates = useMemo(
    () => routeCoordinates ?? normalizedMarkers.filter((m) => !m.priceLabel).map((marker) => marker.coordinate),
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
    if (isWeb || !showRoutes || routeMarkerCoordinates.length === 0) {
      setUpcomingRouteCoords([]);
      return;
    }

    if (shouldHideMainRouteForStayFocus) {
      setUpcomingRouteCoords([]);
      return;
    }

    let isCancelled = false;
    async function loadRoutes() {
      if (routeCoordinates) {
        if (routeMarkerCoordinates.length > 1) {
          const coords = await fetchRoutePath(routeMarkerCoordinates);
          if (!isCancelled) {
            setUpcomingRouteCoords(coords);
          }
        } else if (!isCancelled) {
          setUpcomingRouteCoords([]);
        }
      } else if (userCoordinate) {
        const upcomingPathInput = [userCoordinate, ...routeMarkerCoordinates];
        if (upcomingPathInput.length > 1) {
          const coords = await fetchRoutePath(upcomingPathInput);
          if (!isCancelled) {
            setUpcomingRouteCoords(coords);
          }
        } else if (!isCancelled) {
          setUpcomingRouteCoords([]);
        }
      } else if (routeMarkerCoordinates.length > 1) {
        const coords = await fetchRoutePath(routeMarkerCoordinates);
        if (!isCancelled) {
          setUpcomingRouteCoords(coords);
        }
      } else if (!isCancelled) {
        setUpcomingRouteCoords([]);
      }
    }

    void loadRoutes();
    return () => {
      isCancelled = true;
    };
  }, [isWeb, routeCoordinates, routeMarkerCoordinates, routeMarkersKey, shouldHideMainRouteForStayFocus, showRoutes, userCoordinate]);

  useEffect(() => {
    if (isWeb || !showRoutes || stayMarkers.length === 0 || !userCoordinate) {
      setStayBranchCoords({});
      return;
    }

    let isCancelled = false;

    async function loadStayBranches() {
      const branches: Record<string, { latitude: number; longitude: number }[]> = {};

      for (const stay of stayMarkers) {
        if (stay.status === 'active' || stay.status === 'upcoming') {
          const branchPath = await fetchRoutePath([userCoordinate as readonly [number, number], stay.coordinate]);
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
  }, [isWeb, stayMarkers, showRoutes, userCoordinate]);

  useEffect(() => {
    if (isWeb || !MapboxGL || !cameraRef.current) return;

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
    cameraRef.current.setCamera({
      centerCoordinate: toMapboxPosition(mapCenterCoordinate),
      padding: cameraPadding,
      zoomLevel,
      animationDuration: 1000,
      animationMode: 'easeTo',
    });
    if (resolvedCenterCoordinate) {
      hasCenteredOnResolvedDataRef.current = true;
    }
  }, [MapboxGL, cameraPadding, centerCoordinate, isWeb, mapCenterCoordinate, resolvedCenterCoordinate, zoomLevel]);

  useEffect(() => {
    if (isWeb || !MapboxGL || !cameraRef.current || !userCoordinate || hasSettledOnUserRef.current) return;

    hasSettledOnUserRef.current = true;
    lastCameraTargetKeyRef.current = getCameraTargetKey(userCoordinate, 17);
    cameraRef.current.setCamera({
      centerCoordinate: toMapboxPosition(userCoordinate),
      heading: userHeading ?? 0,
      padding: cameraPadding,
      pitch: 45,
      zoomLevel: 17,
      animationDuration: 1000,
      animationMode: 'easeTo',
    });
  }, [MapboxGL, cameraPadding, isWeb, userCoordinate, userHeading]);

  useEffect(() => {
    if (isWeb || !MapboxGL || !cameraRef.current || !userCoordinate || recenterToUserSignal === 0) return;

    hasUserInteractedRef.current = false;
    lastCameraTargetKeyRef.current = getCameraTargetKey(userCoordinate, 17);
    cameraRef.current.setCamera({
      centerCoordinate: toMapboxPosition(userCoordinate),
      heading: userHeading ?? 0,
      padding: cameraPadding,
      pitch: 45,
      zoomLevel: 17,
      animationDuration: 650,
      animationMode: 'easeTo',
    });
  }, [MapboxGL, cameraPadding, isWeb, recenterToUserSignal, userCoordinate, userHeading]);

  useEffect(() => {
    if (!MapboxGL || !MAPBOX_ACCESS_TOKEN) return;

    void MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
  }, [MapboxGL]);

  if (isWeb) {
    if (!MAPBOX_ACCESS_TOKEN) {
        return (
          <View style={[styles.fallback, { backgroundColor: fallbackBackgroundColor }]}>
            <ThemedText style={[styles.fallbackTitle, { color: fallbackTextColor }]}>Mapbox needs an access token to render maps.</ThemedText>
          </View>
        );
    }

    const MapboxMap = MapboxGL?.MapView;

    if (!MapboxMap) {
        return (
          <View style={[styles.fallback, { backgroundColor: fallbackBackgroundColor }]}>
            <ThemedText style={[styles.fallbackTitle, { color: fallbackTextColor }]}>Map preview is still loading...</ThemedText>
          </View>
        );
    }

    return (
      <View style={[styles.mapRoot, style]}>
        <MapboxMap
          style={StyleSheet.absoluteFill}
          styleURL={styleURL ?? undefined}
        >
           <MapboxGL.Camera
              centerCoordinate={toMapboxPosition(mapCenterCoordinate)}
              padding={cameraPadding}
              zoomLevel={zoomLevel}
            />
            <MapRouteOverlays 
                upcomingRouteCoords={upcomingRouteCoords}
                stayBranchCoords={stayBranchCoords}
            />
            {normalizedMarkers.map((marker) => {
                return (
                    <MapboxPlaceMarker
                        isDark={isDark}
                        marker={marker}
                        key={marker.id}
                        onPress={onMarkerPress}
                        variant={markerVariant}
                    />
                );
            })}
        </MapboxMap>
      </View>
    );
  }

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <View style={[styles.fallback, { backgroundColor: fallbackBackgroundColor }]}>
        <ThemedText style={[styles.fallbackTitle, { color: fallbackTextColor }]}>Mapbox needs an access token to render maps.</ThemedText>
      </View>
    );
  }

  if (!MapboxGL) {
    return (
      <View style={[styles.fallback, { backgroundColor: fallbackBackgroundColor }]}>
        <ThemedText style={[styles.fallbackTitle, { color: fallbackTextColor }]}>
          Mapbox maps need a custom development build. Rebuild Wandr to enable native maps.
        </ThemedText>
      </View>
    );
  }

  if (!styleURL) {
    return (
      <View style={[styles.fallback, { backgroundColor: fallbackBackgroundColor }]}>
        <ThemedText style={[styles.fallbackTitle, { color: fallbackTextColor }]}>Map style is still loading.</ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[styles.mapRoot, style]}
      onTouchStart={() => {
        hasUserInteractedRef.current = true;
        onInteract?.();
      }}>
      <MapboxGL.MapView
        key="map-preview"
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        styleURL={styleURL}
        onDidFinishLoadingStyle={() => {
          hideNativeBaseMapDetails(mapRef.current);
        }}
        onPress={(feature) => {
          const coordinate = feature.geometry?.coordinates;
          if (Array.isArray(coordinate) && coordinate.length >= 2) {
            onMapPress?.([Number(coordinate[0]), Number(coordinate[1])]);
          }
          hasUserInteractedRef.current = true;
          onInteract?.();
        }}
        onCameraChanged={(state) => {
          if (state.gestures.isGestureActive) {
            hasUserInteractedRef.current = true;
            onInteract?.();
          }
        }}
        onMapIdle={(state) => {
          if (state.gestures.isGestureActive) {
            hasUserInteractedRef.current = true;
            onInteract?.();
          }
        }}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
        rotateEnabled
        pitchEnabled
        scrollEnabled
        zoomEnabled
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: toMapboxPosition(mapCenterCoordinate),
            padding: cameraPadding,
            zoomLevel,
          }}
          centerCoordinate={toMapboxPosition(mapCenterCoordinate)}
          padding={cameraPadding}
          zoomLevel={zoomLevel}
          animationMode="none"
        />
        <MapboxGL.UserLocation visible={!userCoordinate} animated showsUserHeadingIndicator />
        {userCoordinate ? (
          <MapboxUserMarker
            avatarPaletteKey={userAvatarPaletteKey}
            avatarUri={userAvatarUri}
            coordinate={userCoordinate}
            heading={userHeading}
            name={userName}
          />
        ) : null}

        {normalizedMarkers.map((marker) => {
          return (
            <MapboxPlaceMarker
              key={`marker-${[
                marker.id,
                marker.coordinate[0],
                marker.coordinate[1],
                marker.priceLabel ?? '',
                marker.status ?? '',
              ].join('-')}`}
              isDark={isDark}
              marker={marker}
              variant={markerVariant}
              onPress={onMarkerPress}
            />
          );
        })}

        <MapRouteOverlays upcomingRouteCoords={upcomingRouteCoords} stayBranchCoords={stayBranchCoords} />
      </MapboxGL.MapView>
    </View>
  );
}

export const MapPreview = memo(MapPreviewComponent);
export type { MapMarker, MapPreviewProps };

function hideNativeBaseMapDetails(map: MapboxMapView | null) {
  if (!map) return;

  HIDDEN_MAPBOX_SOURCE_LAYER_IDS.forEach((sourceLayerId) => {
    try {
      map.setSourceVisibility(false, 'composite', sourceLayerId);
    } catch {
      // Some Mapbox styles omit specific source layers; the rest should still be hidden.
    }
  });
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

function toMapboxPosition(coordinate: readonly [number, number]): [number, number] {
  return [coordinate[0], coordinate[1]];
}

function normalizeCameraPadding(viewportPadding: MapPreviewProps['viewportPadding']) {
  return {
    paddingBottom: viewportPadding?.paddingBottom ?? 0,
    paddingLeft: viewportPadding?.paddingLeft ?? 0,
    paddingRight: viewportPadding?.paddingRight ?? 0,
    paddingTop: viewportPadding?.paddingTop ?? 0,
  };
}

function getCameraTargetKey(coordinate: readonly [number, number], zoomLevel: number) {
  return `${coordinate[0].toFixed(6)},${coordinate[1].toFixed(6)}:${zoomLevel}`;
}

const styles = StyleSheet.create({
  mapRoot: {
    flex: 1,
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
