import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Mapbox, { Camera, LineLayer, MapView, MarkerView, ShapeSource, StyleURL } from '@rnmapbox/maps';

import { ThemedText } from '@/components/themed-text';
import { UserLocationPuck } from '@/components/wandr/maps/user-location-puck';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchRoutePath } from '@/lib/routing';

import type { MapMarker, MapPreviewProps, SharedMapUserLocation } from './mapbox/types';

export type { MapMarker, MapPreviewProps, SharedMapUserLocation };

// The public access token (pk.…) is read at runtime; the native SDK download is
// authorized at build time via the config plugin's RNMapboxMapsDownloadToken.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null);

const DEFAULT_MAP_CENTER: readonly [number, number] = [17.0832, -22.5597];
const USER_FOCUS_ZOOM_LEVEL = 17;
const CAMERA_ANIMATION_MS = 650;
type NativeRoutePoint = { latitude: number; longitude: number };

function MapPreviewComponent({
  centerCoordinate,
  colorSchemeMode = 'system',
  followUserLocation = false,
  interactionEnabled = true,
  markerVariant = 'default',
  markers = [],
  onInteract,
  onMapPress,
  onMarkerPress,
  recenterToUserSignal = 0,
  routeCoordinates,
  sharedUserLocations = [],
  showRoutes = true,
  style,
  userAvatarPaletteKey = null,
  userAvatarUri = null,
  userCoordinate = null,
  userHeading = null,
  userIsStale = false,
  userName = null,
  userPuckVariant = 'navigation',
  userSpeed = null,
  viewportPadding,
  zoomLevel = 14,
}: MapPreviewProps) {
  const cameraRef = useRef<Camera | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorSchemeMode === 'dark' || (colorSchemeMode === 'system' && colorScheme === 'dark');
  const normalizedMarkers = useMemo(() => normalizeMarkers(markers), [markers]);
  const normalizedSharedUserLocations = useMemo(
    () => normalizeSharedUserLocations(sharedUserLocations),
    [sharedUserLocations]
  );
  const routeInputCoordinates = useMemo(
    () =>
      getRouteInputCoordinates({
        markers: normalizedMarkers,
        routeCoordinates,
        userCoordinate,
      }),
    [normalizedMarkers, routeCoordinates, userCoordinate]
  );
  const routeRequestKey = useMemo(() => getRouteRequestKey(routeInputCoordinates), [routeInputCoordinates]);
  const directRouteLineCoordinates = useMemo(
    () => routeInputCoordinates.map(toLatLng).filter(isValidLatLng),
    [routeInputCoordinates]
  );
  const [resolvedRoute, setResolvedRoute] = useState<{ coordinates: NativeRoutePoint[]; key: string }>({
    coordinates: [],
    key: '',
  });
  const resolvedCenterCoordinate =
    centerCoordinate ?? userCoordinate ?? normalizedMarkers[0]?.coordinate ?? normalizedSharedUserLocations[0]?.coordinate ?? DEFAULT_MAP_CENTER;
  const followZoomLevel = Math.max(zoomLevel, USER_FOCUS_ZOOM_LEVEL);
  const activeCenterCoordinate = followUserLocation && userCoordinate ? userCoordinate : resolvedCenterCoordinate;
  const effectiveZoomLevel = followUserLocation && userCoordinate ? followZoomLevel : zoomLevel;
  const routeLineCoordinates =
    resolvedRoute.key === routeRequestKey && resolvedRoute.coordinates.length > 1
      ? resolvedRoute.coordinates
      : directRouteLineCoordinates;
  const cameraPadding = useMemo(
    () => ({
      paddingTop: viewportPadding?.paddingTop ?? 0,
      paddingBottom: viewportPadding?.paddingBottom ?? 0,
      paddingLeft: viewportPadding?.paddingLeft ?? 0,
      paddingRight: viewportPadding?.paddingRight ?? 0,
    }),
    [viewportPadding]
  );

  const routeShape = useMemo<GeoJSON.Feature<GeoJSON.LineString> | null>(() => {
    if (!showRoutes || routeLineCoordinates.length < 2) {
      return null;
    }

    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: routeLineCoordinates.map((point) => [point.longitude, point.latitude]),
      },
    };
  }, [routeLineCoordinates, showRoutes]);

  useEffect(() => {
    let isCancelled = false;

    async function loadRoute() {
      await Promise.resolve();

      if (!showRoutes || routeInputCoordinates.length < 2) {
        if (!isCancelled) {
          setResolvedRoute({ coordinates: [], key: routeRequestKey });
        }
        return;
      }

      const coordinates = (await fetchRoutePath(routeInputCoordinates)).filter(isValidLatLng);
      if (!isCancelled) {
        setResolvedRoute({ coordinates, key: routeRequestKey });
      }
    }

    void loadRoute();

    return () => {
      isCancelled = true;
    };
  }, [routeInputCoordinates, routeRequestKey, showRoutes]);

  useEffect(() => {
    if (!userCoordinate || recenterToUserSignal === 0) {
      return;
    }

    cameraRef.current?.setCamera({
      centerCoordinate: [userCoordinate[0], userCoordinate[1]],
      zoomLevel: followZoomLevel,
      animationDuration: CAMERA_ANIMATION_MS,
    });
  }, [followZoomLevel, recenterToUserSignal, userCoordinate]);

  return (
    <View style={[styles.root, style]}>
      <MapView
        style={styles.map}
        styleURL={isDark ? StyleURL.Dark : StyleURL.Light}
        compassEnabled={false}
        scaleBarEnabled={false}
        scrollEnabled={interactionEnabled}
        zoomEnabled={interactionEnabled}
        rotateEnabled={false}
        pitchEnabled={false}
        onPress={(feature) => {
          const coordinate = feature.geometry?.coordinates;
          if (Array.isArray(coordinate) && coordinate.length >= 2) {
            onMapPress?.([coordinate[0], coordinate[1]]);
          }
          if (interactionEnabled) {
            onInteract?.();
          }
        }}
        onRegionDidChange={(event) => {
          if (interactionEnabled && (event?.properties as { isUserInteraction?: boolean })?.isUserInteraction) {
            onInteract?.();
          }
        }}>
        <Camera
          ref={cameraRef}
          centerCoordinate={[activeCenterCoordinate[0], activeCenterCoordinate[1]]}
          zoomLevel={effectiveZoomLevel}
          animationDuration={CAMERA_ANIMATION_MS}
          padding={cameraPadding}
        />

        {routeShape ? (
          <ShapeSource id="wandr-route" shape={routeShape}>
            <LineLayer
              id="wandr-route-line"
              style={{
                lineColor: isDark ? 'rgba(198,239,174,0.9)' : designSystem.colors.darkGreen,
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </ShapeSource>
        ) : null}

        {normalizedMarkers.map((marker) => (
          <MarkerView
            key={`${marker.id}:${marker.coordinate[0]}:${marker.coordinate[1]}:${marker.priceLabel ?? ''}`}
            coordinate={[marker.coordinate[0], marker.coordinate[1]]}
            anchor={marker.priceLabel ? { x: 0.5, y: 1 } : { x: 0.5, y: 0.5 }}
            allowOverlap>
            <Pressable
              accessibilityLabel={marker.label ?? marker.priceLabel ?? 'Map marker'}
              accessibilityRole="button"
              onPress={() => onMarkerPress?.(marker)}>
              <NativeMapMarker isDark={isDark} marker={marker} variant={markerVariant} />
            </Pressable>
          </MarkerView>
        ))}

        {userCoordinate ? (
          <MarkerView coordinate={[userCoordinate[0], userCoordinate[1]]} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
            <UserLocationPuck
              avatarPaletteKey={userAvatarPaletteKey}
              avatarUri={userAvatarUri}
              heading={userHeading}
              isStale={userIsStale}
              name={userName}
              speed={userSpeed}
              variant={userPuckVariant}
            />
          </MarkerView>
        ) : null}

        {normalizedSharedUserLocations.map((location) => (
          <MarkerView
            key={`${location.travelerSlug}:${location.coordinate[0]}:${location.coordinate[1]}`}
            coordinate={[location.coordinate[0], location.coordinate[1]]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap>
            <UserLocationPuck
              avatarPaletteKey={location.travelerSlug}
              avatarUri={location.avatarUri}
              heading={location.heading}
              name={location.name}
              speed={location.speed}
              variant="avatar"
            />
          </MarkerView>
        ))}
      </MapView>
    </View>
  );
}

export const MapPreview = memo(MapPreviewComponent);

function NativeMapMarker({
  isDark,
  marker,
  variant,
}: {
  isDark: boolean;
  marker: MapMarker;
  variant: MapPreviewProps['markerVariant'];
}) {
  if (marker.priceLabel) {
    return (
      <View style={[styles.priceMarker, isDark && styles.priceMarkerDark]}>
        <View style={styles.priceMarkerDot} />
        <View style={styles.priceMarkerPill}>
          <View style={[styles.priceMarkerPillFill, isDark && styles.priceMarkerPillFillDark]}>
            <ThemedText
              darkColor={isDark ? designSystem.colors.darkText : designSystem.colors.ink}
              lightColor={designSystem.colors.ink}
              style={styles.priceMarkerText}
            >
              {marker.priceLabel}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  const isRouteWidget = variant === 'routeWidget';
  const isAccent = marker.tone === 'accent' || marker.status === 'active';
  const imageUri = getMarkerImageUri(marker);

  return (
    <View
      style={[
        styles.placeMarker,
        isRouteWidget && styles.placeMarkerRouteWidget,
        isAccent ? styles.placeMarkerAccent : null,
        marker.status === 'completed' ? styles.placeMarkerCompleted : null,
        isDark && styles.placeMarkerDark,
      ]}
    >
      {imageUri ? (
        <Image contentFit="cover" source={{ uri: imageUri }} style={styles.placeMarkerImage} />
      ) : (
        <View style={[styles.placeMarkerCore, isAccent ? styles.placeMarkerCoreAccent : null]} />
      )}
    </View>
  );
}

function getMarkerImageUri(marker: MapMarker) {
  if (typeof marker.imageUri !== 'string') {
    return null;
  }

  const imageUri = marker.imageUri.trim();
  return imageUri.length > 0 ? imageUri : null;
}

function normalizeMarkers(markers: readonly MapMarker[]) {
  return markers.filter((marker) => isValidCoordinate(marker.coordinate));
}

function normalizeSharedUserLocations(locations: readonly SharedMapUserLocation[]) {
  return locations.filter((location) => isValidCoordinate(location.coordinate));
}

function getRouteInputCoordinates({
  markers,
  routeCoordinates,
  userCoordinate,
}: {
  markers: readonly MapMarker[];
  routeCoordinates?: readonly (readonly [number, number])[];
  userCoordinate?: readonly [number, number] | null;
}) {
  const baseCoordinates =
    routeCoordinates ??
    markers
      .filter((marker) => !marker.priceLabel)
      .map((marker) => marker.coordinate);
  const coordinates =
    routeCoordinates || !userCoordinate || baseCoordinates.length === 0
      ? baseCoordinates
      : [userCoordinate, ...baseCoordinates];

  return dedupeConsecutiveCoordinates(
    coordinates.filter((coordinate): coordinate is readonly [number, number] => isValidCoordinate(coordinate))
  );
}

function dedupeConsecutiveCoordinates(coordinates: readonly (readonly [number, number])[]) {
  return coordinates.filter((coordinate, index, all) => {
    const previous = all[index - 1];

    return !previous || previous[0] !== coordinate[0] || previous[1] !== coordinate[1];
  });
}

function getRouteRequestKey(coordinates: readonly (readonly [number, number])[]) {
  return coordinates.map((coordinate) => `${coordinate[0]},${coordinate[1]}`).join(';');
}

function isValidCoordinate(coordinate?: readonly [number, number] | null) {
  if (!coordinate || coordinate.length !== 2) {
    return false;
  }

  const [longitude, latitude] = coordinate;
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    Math.abs(longitude) <= 180 &&
    Math.abs(latitude) <= 90
  );
}

function toLatLng(coordinate: readonly [number, number]) {
  return {
    latitude: coordinate[1],
    longitude: coordinate[0],
  };
}

function isValidLatLng(coordinate: { latitude: number; longitude: number }) {
  return (
    Number.isFinite(coordinate.longitude) &&
    Number.isFinite(coordinate.latitude) &&
    Math.abs(coordinate.longitude) <= 180 &&
    Math.abs(coordinate.latitude) <= 90
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  placeMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.copper,
    borderWidth: 3,
    borderColor: designSystem.colors.white,
    overflow: 'hidden',
    boxShadow: '0 8px 14px rgba(0,0,0,0.18)',
  },
  placeMarkerRouteWidget: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
  placeMarkerAccent: {
    backgroundColor: designSystem.colors.darkGreen,
    borderColor: designSystem.colors.darkGreen,
  },
  placeMarkerCompleted: {
    opacity: 0.55,
  },
  placeMarkerDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.whiteOverlayBorder,
  },
  placeMarkerImage: {
    width: '100%',
    height: '100%',
  },
  placeMarkerCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: designSystem.colors.white,
  },
  placeMarkerCoreAccent: {
    backgroundColor: designSystem.colors.lime,
  },
  priceMarker: {
    alignItems: 'center',
  },
  priceMarkerDark: {
    opacity: 0.96,
  },
  priceMarkerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: designSystem.colors.darkGreen,
    marginBottom: -2,
  },
  priceMarkerPill: {
    minWidth: 58,
    height: 30,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.white,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
    padding: 4,
  },
  priceMarkerPillFill: {
    flex: 1,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.limeMist,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  priceMarkerPillFillDark: {
    backgroundColor: designSystem.colors.darkSurface,
  },
  priceMarkerText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
});
