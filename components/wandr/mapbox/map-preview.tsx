import { memo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type MapMarker = {
  id: string;
  coordinate: readonly [number, number];
  label?: string;
  tone?: 'accent' | 'dark';
};

type MapPreviewProps = {
  centerCoordinate: readonly [number, number];
  markers?: ReadonlyArray<MapMarker>;
  zoomLevel?: number;
  onInteract?: () => void;
};

export const MapPreview = memo(function MapPreview({
  centerCoordinate,
  markers = [],
  zoomLevel = 11,
  onInteract,
}: MapPreviewProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fallback, styles.webFallback]}>
        <ThemedText style={styles.fallbackTitle}>Map preview is mobile-only right now.</ThemedText>
      </View>
    );
  }

  // Calculate rough delta from zoomLevel
  const delta = zoomLevel ? 180 / Math.pow(2, zoomLevel) : 0.1;

  const region = {
    latitude: centerCoordinate[1],
    longitude: centerCoordinate[0],
    latitudeDelta: delta,
    longitudeDelta: delta,
  };

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      onTouchStart={onInteract}
      onPanDrag={onInteract}
      showsUserLocation={false}
      showsCompass={false}
      showsMyLocationButton={false}
    >
      {markers.map((marker: MapMarker) => (
        <Marker
          key={marker.id}
          coordinate={{ latitude: marker.coordinate[1], longitude: marker.coordinate[0] }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View
            style={[
              styles.marker,
              marker.tone === 'dark' ? styles.markerDark : styles.markerAccent,
            ]}>
            <ThemedText style={[styles.markerLabel, marker.tone === 'dark' ? styles.markerDarkLabel : undefined]}>
              {marker.label ?? ''}
            </ThemedText>
          </View>
        </Marker>
      ))}
    </MapView>
  );
});

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
  marker: {
    minWidth: 34,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: designSystem.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#0e0f0c',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  markerAccent: {
    backgroundColor: designSystem.colors.lime,
  },
  markerDark: {
    backgroundColor: designSystem.colors.ink,
  },
  markerLabel: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
    color: designSystem.colors.darkGreen,
  },
  markerDarkLabel: {
    color: '#ffffff',
  },
});
