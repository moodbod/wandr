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
  const [completedRouteCoords, setCompletedRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [upcomingRouteCoords, setUpcomingRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const isWeb = Platform.OS === 'web';
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
    if (isWeb || markers.length < 2) return;

    async function loadRoutes() {
      const activeIndex = markers.findIndex((marker) => marker.status === 'active');
      const pivotIndex = activeIndex === -1 ? markers.length - 1 : activeIndex;

      const completed = markers.slice(0, pivotIndex + 1).map((marker) => marker.coordinate);
      const fullRoute = markers.map((marker) => marker.coordinate);

      if (userCoordinate) {
        completed.unshift(userCoordinate);
        fullRoute.unshift(userCoordinate);
      }

      if (completed.length > 1) {
        const coords = await fetchRoutePath(completed);
        setCompletedRouteCoords(coords);
      } else {
        setCompletedRouteCoords([]);
      }

      if (fullRoute.length > 1) {
        const coords = await fetchRoutePath(fullRoute);
        setUpcomingRouteCoords(coords);
      } else {
        setUpcomingRouteCoords([]);
      }
    }

    void loadRoutes();
  }, [isWeb, markers, userCoordinate]);

  useEffect(() => {
    if (isWeb || !mapRef.current) return;

    mapRef.current.animateToRegion(region, 500);
  }, [isWeb, region]);

  if (isWeb) {
    return (
      <View style={[styles.fallback, styles.webFallback]}>
        <ThemedText style={styles.fallbackTitle}>Map preview is mobile-only right now.</ThemedText>
      </View>
    );
  }

  return (
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
      showsUserLocation={false}
      showsCompass={false}
      showsMyLocationButton={false}
      customMapStyle={isDark ? darkMapStyle : lightMapStyle}
    >
      {userCoordinate ? (
        <Marker
          coordinate={{ latitude: userCoordinate[1], longitude: userCoordinate[0] }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={20}
        >
          <View style={styles.userMarkerShell}>
            {userHeading !== null ? (
              <View
                style={[
                  styles.userHeadingWrap,
                  {
                    transform: [{ rotate: `${userHeading}deg` }],
                  },
                ]}
              >
                <View style={[styles.userHeadingCone, isDark && styles.userHeadingConeDark]} />
              </View>
            ) : null}
            <View style={[styles.userMarkerPulse, isDark && styles.userMarkerPulseDark]} />
            <View style={[styles.userMarkerCore, isDark && styles.userMarkerCoreDark]}>
              <View style={styles.userMarkerDot} />
            </View>
          </View>
        </Marker>
      ) : null}

      {upcomingRouteCoords.length > 1 ? (
        <Polyline
          coordinates={upcomingRouteCoords}
          strokeColor={isDark ? 'rgba(249,249,246,0.32)' : 'rgba(14,15,12,0.28)'}
          strokeWidth={3}
          lineDashPattern={Platform.OS === 'android' ? [15, 15] : [6, 8]}
          zIndex={1}
        />
      ) : null}

      {completedRouteCoords.length > 1 ? (
        <Polyline
          coordinates={completedRouteCoords}
          strokeColor={designSystem.colors.lime}
          strokeWidth={3}
          lineCap="round"
          lineJoin="round"
          zIndex={2}
        />
      ) : null}

      {markers.map((marker) => {
        const isFaded = marker.status === 'completed';
        const isActive = marker.status === 'active';

        return (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.coordinate[1], longitude: marker.coordinate[0] }}
            anchor={{ x: 0.5, y: 0.92 }}
            onPress={() => onMarkerPress?.(marker)}
            style={{ opacity: isFaded ? 0.5 : 1, zIndex: isActive ? 10 : 1 }}
          >
            <View style={[styles.markerShell, isActive && styles.markerShellActive]}>
              <View
                style={[
                  styles.thumbnailFrame,
                  isDark && styles.thumbnailFrameDark,
                  isActive && styles.thumbnailFrameActive,
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
          </Marker>
        );
      })}
    </MapView>
  );
}

export const MapPreview = memo(MapPreviewComponent);

const styles = StyleSheet.create({
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
  userMarkerShell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userHeadingWrap: {
    position: 'absolute',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  userHeadingCone: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 44,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(159, 232, 112, 0.42)',
  },
  userHeadingConeDark: {
    borderBottomColor: 'rgba(159, 232, 112, 0.52)',
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(159, 232, 112, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(159, 232, 112, 0.45)',
  },
  userMarkerPulseDark: {
    backgroundColor: 'rgba(159, 232, 112, 0.28)',
    borderColor: 'rgba(159, 232, 112, 0.58)',
  },
  userMarkerCore: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: designSystem.colors.darkGreen,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerCoreDark: {
    borderColor: designSystem.colors.darkBackground,
  },
  userMarkerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: designSystem.colors.lime,
  },
  markerShellActive: {
    transform: [{ scale: 1.15 }],
  },
  thumbnailFrame: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: designSystem.colors.background,
    backgroundColor: designSystem.colors.surfaceMuted,
  },
  thumbnailFrameDark: {
    borderColor: designSystem.colors.darkBackground,
    backgroundColor: designSystem.colors.darkSurface,
  },
  thumbnailFrameActive: {
    borderColor: designSystem.colors.lime,
    borderWidth: 4,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 27, // Added for Android clipping
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
    fontWeight: '900',
    color: designSystem.colors.darkGreen,
  },
  markerDarkLabel: {
    color: '#ffffff',
  },
});
