import { Image } from 'expo-image';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { darkMapStyle, lightMapStyle } from '@/constants/map-styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchRoutePath } from '@/lib/routing';

type MapMarker = {
  id: string;
  coordinate: readonly [number, number];
  experienceSlug?: string;
  imageUri?: string;
  label?: string;
  priceLabel?: string;
  tone?: 'accent' | 'dark';
  status?: 'completed' | 'active' | 'upcoming';
};

type MapPreviewProps = {
  centerCoordinate?: readonly [number, number] | null;
  userCoordinate?: readonly [number, number] | null;
  userHeading?: number | null;
  markers?: readonly MapMarker[];
  zoomLevel?: number;
  showRoutes?: boolean;
  onInteract?: () => void;
  onMarkerPress?: (marker: MapMarker) => void;
};

function MapPreviewComponent({
  centerCoordinate,
  userCoordinate = null,
  userHeading = null,
  markers = [],
  zoomLevel = 24,
  showRoutes = true,
  onInteract,
  onMarkerPress,
}: MapPreviewProps) {
  const mapRef = useRef<MapView | null>(null);
  const hasSettledOnUserRef = useRef(false);
  const [upcomingRouteCoords, setUpcomingRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const isWeb = Platform.OS === 'web';
  const isIOS = Platform.OS === 'ios';
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const resolvedCenterCoordinate = centerCoordinate ?? userCoordinate ?? markers[0]?.coordinate ?? null;
  const markerSignature = useMemo(
    () =>
      markers
        .map((marker) =>
          [
            marker.id,
            marker.coordinate[0],
            marker.coordinate[1],
            marker.priceLabel ?? '',
            marker.status ?? '',
            marker.tone ?? '',
            marker.imageUri ?? '',
          ].join(':')
        )
        .join('|'),
    [markers]
  );
  const mapViewKey = useMemo(() => {
    if (!isIOS) return 'map-preview';
    // Force a clean remount whenever marker order or marker content changes on iOS.
    // AIRMap can crash if Fabric tries to incrementally reorder custom marker subviews.
    return `map-preview-${markerSignature}`;
  }, [isIOS, markerSignature]);

  const delta = zoomLevel ? 180 / Math.pow(2, zoomLevel) : 0.1;

  const region = useMemo(
    () => ({
      latitude: resolvedCenterCoordinate?.[1] ?? 0,
      longitude: resolvedCenterCoordinate?.[0] ?? 0,
      latitudeDelta: delta,
      longitudeDelta: delta,
    }),
    [delta, resolvedCenterCoordinate]
  );

  // Identify "stay" markers vs "route" markers
  const stayMarkers = useMemo(() => markers.filter((m) => !!m.priceLabel), [markers]);
  const routeMarkers = useMemo(() => markers.filter((m) => !m.priceLabel), [markers]);
  const shouldHideMainRouteForStayFocus = useMemo(
    () => stayMarkers.length === 1 && stayMarkers[0].status === 'active',
    [stayMarkers]
  );

  const routeMarkersKey = useMemo(
    () => routeMarkers.map((m) => `${m.coordinate[0]},${m.coordinate[1]},${m.status}`).join('|'),
    [routeMarkers]
  );
  const routeMarkerCoordinates = useMemo(
    () => routeMarkers.map((marker) => marker.coordinate),
    [routeMarkers]
  );

  useEffect(() => {
    if (isWeb || !showRoutes || routeMarkers.length === 0) {
      setUpcomingRouteCoords([]);
      return;
    }

    // Only draw the main trip route if we are NOT viewing a specific stay branch
    // This keeps the map focused only on the booked room route when applicable
    if (shouldHideMainRouteForStayFocus) {
      setUpcomingRouteCoords([]);
      return;
    }

    async function loadRoutes() {
      // Upcoming route (dashed): from the user's current location to the rest of the trip.
      const upcomingMarkers = routeMarkers
        .filter((m) => m.status === 'active' || m.status === 'upcoming')
        .map((m) => m.coordinate);

      if (userCoordinate) {
        // Upcoming path starts at user
        const upcomingPathInput = [userCoordinate, ...upcomingMarkers];
        if (upcomingPathInput.length > 1) {
          const coords = await fetchRoutePath(upcomingPathInput);
          setUpcomingRouteCoords(coords);
        } else {
          setUpcomingRouteCoords([]);
        }
      } else {
        // Fallback if no GPS: just show the full upcoming route from trip markers
        if (routeMarkerCoordinates.length > 1) {
          const coords = await fetchRoutePath(routeMarkerCoordinates);
          setUpcomingRouteCoords(coords);
        } else {
          setUpcomingRouteCoords([]);
        }
      }
    }

    void loadRoutes();
  }, [isWeb, routeMarkerCoordinates, routeMarkers, routeMarkersKey, shouldHideMainRouteForStayFocus, showRoutes, userCoordinate]);

  // Handle branching routes for booked stays
  const [stayBranchCoords, setStayBranchCoords] = useState<Record<string, { latitude: number; longitude: number }[]>>({});

  useEffect(() => {
    if (isWeb || !showRoutes || stayMarkers.length === 0 || !userCoordinate) {
      setStayBranchCoords({});
      return;
    }

    async function loadStayBranches() {
      const branches: Record<string, { latitude: number; longitude: number }[]> = {};
      
      // Filter for stays that are actually booked (in the itinerary)
      // Stay markers in the itinerary are marked as 'active' or 'upcoming' 
      // but we should only draw branches for those that aren't the main focus 
      // if they are part of the "booked" set.
      for (const stay of stayMarkers) {
        // Only branch for stays that have a status indicating they are part of the trip
        // and are not currently the main focus (to avoid clutter)
        if (stay.status === 'active' || stay.status === 'upcoming') {
          const branchPath = await fetchRoutePath([userCoordinate as readonly [number, number], stay.coordinate]);
          if (branchPath.length > 1) {
            branches[stay.id] = branchPath;
          }
        }
      }
      setStayBranchCoords(branches);
    }

    void loadStayBranches();
  }, [isWeb, stayMarkers, showRoutes, userCoordinate]);

  useEffect(() => {
    if (isWeb || !mapRef.current || !resolvedCenterCoordinate) return;

    mapRef.current.animateCamera({
      center: {
        latitude: resolvedCenterCoordinate[1],
        longitude: resolvedCenterCoordinate[0],
      },
      zoom: zoomLevel,
    }, { duration: 1000 });
  }, [isWeb, resolvedCenterCoordinate, zoomLevel]);

  useEffect(() => {
    if (isWeb || !mapRef.current || !userCoordinate || hasSettledOnUserRef.current) return;

    hasSettledOnUserRef.current = true;
    mapRef.current.animateCamera({
      center: {
        latitude: userCoordinate[1],
        longitude: userCoordinate[0],
      },
      heading: userHeading ?? 0,
      pitch: 45,
      zoom: 17,
    }, { duration: 1000 });
  }, [isWeb, userCoordinate, userHeading]);

  if (isWeb) {
    return (
      <View style={[styles.fallback, styles.webFallback]}>
        <ThemedText style={styles.fallbackTitle}>Map preview is mobile-only right now.</ThemedText>
      </View>
    );
  }

  if (!resolvedCenterCoordinate) {
    return (
      <View style={styles.fallback}>
        <ThemedText style={styles.fallbackTitle}>Map data is still loading.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.mapRoot}>
      <MapView
        key={mapViewKey}
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onTouchStart={onInteract}
        onPanDrag={onInteract}
        onRegionChangeComplete={onInteract}
        rotateEnabled
        pitchEnabled
        scrollEnabled
        zoomEnabled
        showsUserLocation={true}
        followsUserLocation={false}
        showsCompass={false}
        showsMyLocationButton={false}
        customMapStyle={isDark ? darkMapStyle : lightMapStyle}
      >
        {upcomingRouteCoords.length > 0 && (
          <Polyline
            key="upcoming-route-polyline"
            coordinates={upcomingRouteCoords}
            strokeColor={designSystem.colors.lime}
            strokeWidth={4}
            lineDashPattern={[10, 8]}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {Object.entries(stayBranchCoords).map(([id, coords]) => (
          <Polyline
            key={`branch-${id}`}
            coordinates={coords}
            strokeColor={designSystem.colors.lime}
            strokeWidth={4}
            lineDashPattern={[10, 8]}
            lineCap="round"
            lineJoin="round"
          />
        ))}

        {markers.map((marker) => {
          const isFaded = marker.status === 'completed';
          const isActive = marker.status === 'active';
          const pinColor = isActive
            ? designSystem.colors.lime
            : marker.tone === 'dark'
              ? designSystem.colors.warmDark
              : designSystem.colors.darkGreen;

          return (
            <Marker
              key={`marker-${[
                marker.id,
                marker.coordinate[0],
                marker.coordinate[1],
                marker.priceLabel ?? '',
                marker.status ?? '',
              ].join('-')}`}
              coordinate={{ latitude: marker.coordinate[1], longitude: marker.coordinate[0] }}
              anchor={{ x: 0.5, y: marker.priceLabel ? 1 : 0.92 }}
              onPress={() => onMarkerPress?.(marker)}
              style={{ opacity: isFaded ? 0.5 : 1, zIndex: isActive ? 10 : 1 }}
              pinColor={pinColor}
              tracksViewChanges={false}
            >
              {marker.priceLabel ? (
                <View style={styles.priceMarkerShell}>
                  <View
                    style={[
                      styles.priceMarker,
                      isActive ? styles.priceMarkerActive : styles.priceMarkerDefault,
                      marker.tone === 'dark' ? styles.priceMarkerDark : null,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.priceMarkerLabel,
                        isActive ? styles.priceMarkerLabelActive : null,
                        marker.tone === 'dark' && !isActive ? styles.priceMarkerLabelDark : null,
                      ]}
                    >
                      {marker.priceLabel}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.priceMarkerStem,
                      isActive ? styles.priceMarkerStemActive : null,
                      marker.tone === 'dark' ? styles.priceMarkerStemDark : null,
                    ]}
                  />
                </View>
              ) : (
                <View style={[styles.markerShell, isActive && styles.markerShellActive]}>
                  <View
                    style={[
                      styles.thumbnailFrame,
                      isDark && styles.thumbnailFrameDark,
                    ]}
                  >
                    {marker.imageUri ? (
                      <Image source={marker.imageUri} contentFit="cover" style={styles.thumbnailImage} />
                    ) : (
                      <View
                        style={[
                          styles.thumbnailFallback,
                          marker.tone === 'dark' ? styles.markerDark : styles.markerAccent,
                        ]}
                      />
                    )}
                  </View>
                </View>
              )}
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

export const MapPreview = memo(MapPreviewComponent);

const styles = StyleSheet.create({
  mapRoot: {
    flex: 1,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8e8e5',
    paddingHorizontal: 24,
  },
  webFallback: {
    backgroundColor: '#eeeeeb',
  },
  fallbackTitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
  markerShell: {
    alignItems: 'center',
    gap: 6,
  },
  priceMarkerShell: {
    alignItems: 'center',
    gap: 0,
  },
  priceMarker: {
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceMarkerDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  priceMarkerDark: {
    backgroundColor: 'rgba(30, 31, 28, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  priceMarkerActive: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.darkGreen,
    transform: [{ scale: 1.1 }],
  },
  priceMarkerLabel: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
  priceMarkerLabelDark: {
    color: '#ffffff',
  },
  priceMarkerLabelActive: {
    color: designSystem.colors.darkGreen,
  },
  priceMarkerStem: {
    width: 2,
    height: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: -1,
  },
  priceMarkerStemDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  priceMarkerStemActive: {
    backgroundColor: designSystem.colors.darkGreen,
  },
  markerShellActive: {
    transform: [{ scale: 1.04 }],
  },
  thumbnailFrame: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: designSystem.colors.background,
    backgroundColor: designSystem.colors.surfaceMuted,
  },
  thumbnailFrameDark: {
    borderColor: designSystem.colors.darkBackground,
    backgroundColor: designSystem.colors.darkSurface,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  thumbnailFallback: {
    flex: 1,
  },
  marker: {
    minWidth: 28,
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: designSystem.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  markerAccent: {
    backgroundColor: designSystem.colors.lime,
  },
  markerDark: {
    backgroundColor: designSystem.colors.ink,
  },
  markerLabel: {
    fontSize: 10,
    lineHeight: 11,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
  markerDarkLabel: {
    color: '#ffffff',
  },
});
