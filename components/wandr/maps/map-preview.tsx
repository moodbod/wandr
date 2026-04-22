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
  centerCoordinate: readonly [number, number];
  userCoordinate?: readonly [number, number] | null;
  userHeading?: number | null;
  markers?: readonly MapMarker[];
  zoomLevel?: number;
  onInteract?: () => void;
  onMarkerPress?: (marker: MapMarker) => void;
};

function MapPreviewComponent({
  centerCoordinate,
  userCoordinate = null,
  userHeading = null,
  markers = [],
  zoomLevel = 11,
  onInteract,
  onMarkerPress,
}: MapPreviewProps) {
  const mapRef = useRef<MapView | null>(null);
  const hasSettledOnUserRef = useRef(false);
  const [completedRouteCoords, setCompletedRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [upcomingRouteCoords, setUpcomingRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const isWeb = Platform.OS === 'web';
  const isIOS = Platform.OS === 'ios';
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const delta = zoomLevel ? 180 / Math.pow(2, zoomLevel) : 0.1;

  const region = useMemo(
    () => ({
      latitude: centerCoordinate[1],
      longitude: centerCoordinate[0],
      latitudeDelta: delta,
      longitudeDelta: delta,
    }),
    [centerCoordinate, delta]
  );
  useEffect(() => {
    if (isWeb || markers.length === 0) return;

    async function loadRoutes() {
      // 1. Completed Route (Green): From start to user's current location
      // We take all markers marked as 'completed' and add the user's current location at the end
      const completedMarkers = markers.filter(m => m.status === 'completed').map(m => m.coordinate);
      
      // 2. Upcoming Route (Dashed): From user's current location to the rest of the trip
      const upcomingMarkers = markers.filter(m => m.status === 'active' || m.status === 'upcoming').map(m => m.coordinate);

      if (userCoordinate) {
        // Completed path ends at user
        const completedPathInput = [...completedMarkers, userCoordinate];
        if (completedPathInput.length > 1) {
          const coords = await fetchRoutePath(completedPathInput);
          setCompletedRouteCoords(coords);
        } else {
          setCompletedRouteCoords([]);
        }

        // Upcoming path starts at user
        const upcomingPathInput = [userCoordinate, ...upcomingMarkers];
        if (upcomingPathInput.length > 1) {
          const coords = await fetchRoutePath(upcomingPathInput);
          setUpcomingRouteCoords(coords);
        } else {
          setUpcomingRouteCoords([]);
        }
      } else {
        // Fallback if no GPS: just show the full upcoming route from markers
        const fullRoute = markers.map((marker) => marker.coordinate);
        if (fullRoute.length > 1) {
          const coords = await fetchRoutePath(fullRoute);
          setUpcomingRouteCoords(coords);
        }
        setCompletedRouteCoords([]);
      }
    }

    void loadRoutes();
  }, [isWeb, markers, userCoordinate]);

  useEffect(() => {
    if (isWeb || !mapRef.current || !userCoordinate || hasSettledOnUserRef.current) return;

    hasSettledOnUserRef.current = true;
    mapRef.current.animateCamera({
      center: {
        latitude: userCoordinate[1],
        longitude: userCoordinate[0],
      },
      heading: userHeading ?? 0,
      pitch: 45, // Slight tilt for better perspective
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

  return (
    <View style={styles.mapRoot}>
      <MapView
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
        {upcomingRouteCoords && upcomingRouteCoords.length > 1 && (
          <Polyline
            key="upcoming-route-polyline"
            coordinates={upcomingRouteCoords}
            strokeColor={designSystem.colors.lime}
            strokeWidth={3}
            lineDashPattern={Platform.OS === 'android' ? [2, 20] : [0, 12]}
            lineCap="round"
            lineJoin="round"
            zIndex={1}
          />
        )}

        {completedRouteCoords && completedRouteCoords.length > 1 && (
          <Polyline
            key="completed-route-polyline"
            coordinates={completedRouteCoords}
            strokeColor={designSystem.colors.lime}
            strokeWidth={8}
            lineCap="round"
            lineJoin="round"
            zIndex={2}
          />
        )}

        {markers.map((marker, index) => {
          const isFaded = marker.status === 'completed';
          const isActive = marker.status === 'active';
          const pinColor = isActive
            ? designSystem.colors.lime
            : marker.tone === 'dark'
              ? designSystem.colors.warmDark
              : designSystem.colors.darkGreen;

          return (
            <Marker
              key={`marker-${marker.id}-${index}`}
              coordinate={{ latitude: marker.coordinate[1], longitude: marker.coordinate[0] }}
              anchor={{ x: 0.5, y: marker.priceLabel ? 1 : 0.92 }}
              onPress={() => onMarkerPress?.(marker)}
              style={{ opacity: isFaded ? 0.5 : 1, zIndex: isActive ? 10 : 1 }}
              pinColor={pinColor}
              title={marker.label}
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
    minWidth: 88,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: designSystem.radii.pill,
    borderWidth: 3,
    shadowColor: '#0e0f0c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceMarkerDefault: {
    backgroundColor: designSystem.colors.ink,
    borderColor: designSystem.colors.lime,
  },
  priceMarkerDark: {
    backgroundColor: '#232421',
  },
  priceMarkerActive: {
    backgroundColor: designSystem.colors.lime,
    borderColor: '#29580a',
  },
  priceMarkerLabel: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  priceMarkerLabelDark: {
    color: '#ffffff',
  },
  priceMarkerLabelActive: {
    color: designSystem.colors.darkGreen,
  },
  priceMarkerStem: {
    width: 3,
    height: 18,
    borderRadius: 999,
    backgroundColor: designSystem.colors.lime,
    marginTop: -1,
  },
  priceMarkerStemDark: {
    backgroundColor: designSystem.colors.lime,
  },
  priceMarkerStemActive: {
    backgroundColor: '#29580a',
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
