import { Image } from 'expo-image';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

import { getMapboxModule } from './mapbox-module';
import type { MapMarker, MapPreviewProps, MarkerCluster } from './types';

type MapboxMarkerProps = {
  isDark: boolean;
  marker: MapMarker;
  onPress?: (marker: MapMarker) => void;
  transitionFromCoordinate?: readonly [number, number];
  variant?: MapPreviewProps['markerVariant'];
};

export const MapboxPlaceMarker = memo(function MapboxPlaceMarker({
  isDark,
  marker,
  onPress,
  transitionFromCoordinate,
  variant = 'default',
}: MapboxMarkerProps) {
  const [renderCoordinate, setRenderCoordinate] = useState(() => transitionFromCoordinate ?? marker.coordinate);
  const isFaded = marker.status === 'completed';
  const isActive = marker.status === 'active';
  const isRouteWidget = variant === 'routeWidget';
  const MapboxGL = getMapboxModule();
  const priceMarkerTextColor =
    isActive
      ? designSystem.colors.darkGreen
      : marker.tone === 'dark'
        ? designSystem.colors.white
        : designSystem.colors.ink;

  useEffect(() => {
    if (!transitionFromCoordinate) {
      setRenderCoordinate(marker.coordinate);
      return undefined;
    }

    let frameId = 0;
    const duration = 620;
    const startedAt = Date.now();
    const [startLongitude, startLatitude] = transitionFromCoordinate;
    const [targetLongitude, targetLatitude] = marker.coordinate;

    const tick = () => {
      const progress = Math.min((Date.now() - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setRenderCoordinate([
        startLongitude + (targetLongitude - startLongitude) * easedProgress,
        startLatitude + (targetLatitude - startLatitude) * easedProgress,
      ]);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    setRenderCoordinate(transitionFromCoordinate);
    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [marker.coordinate, transitionFromCoordinate]);

  if (!MapboxGL) {
    return null;
  }

  return (
    <MapboxGL.MarkerView
      coordinate={toMapboxPosition(renderCoordinate)}
      anchor={{ x: 0.5, y: marker.priceLabel ? 1 : 0.92 }}
      allowOverlap
      style={[styles.markerView, { opacity: isFaded ? 0.5 : 1, zIndex: isActive ? 10 : 1 }]}
    >
      <Pressable onPress={() => onPress?.(marker)} hitSlop={10}>
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
                lightColor={priceMarkerTextColor}
                darkColor={priceMarkerTextColor}
                style={styles.priceMarkerLabel}
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
                isRouteWidget && styles.routeWidgetThumbnailFrame,
                isDark && styles.thumbnailFrameDark,
              ]}
            >
              {marker.imageUri ? (
                <Image
                  source={marker.imageUri}
                  contentFit="cover"
                  style={[styles.thumbnailImage, isRouteWidget && styles.routeWidgetThumbnailImage]}
                />
              ) : (
                <View
                  style={[
                    styles.thumbnailFallback,
                    marker.tone === 'dark' ? styles.markerDark : styles.markerAccent,
                  ]}
                />
              )}
            </View>
            {isRouteWidget ? <View style={styles.routeWidgetUserDot} /> : null}
          </View>
        )}
      </Pressable>
    </MapboxGL.MarkerView>
  );
});

export function MapboxClusterMarker({
  cluster,
  isDark,
  onPress,
}: {
  cluster: MarkerCluster;
  isDark: boolean;
  onPress: (cluster: MarkerCluster) => void;
}) {
  const MapboxGL = getMapboxModule();

  if (!MapboxGL) {
    return null;
  }

  return (
    <MapboxGL.MarkerView coordinate={toMapboxPosition(cluster.coordinate)} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
      <Pressable onPress={() => onPress(cluster)} hitSlop={10}>
        <View style={[styles.clusterMarker, isDark && styles.clusterMarkerDark]}>
          <ThemedText style={[styles.clusterCount, isDark && styles.clusterCountDark]}>
            {cluster.count}
          </ThemedText>
        </View>
      </Pressable>
    </MapboxGL.MarkerView>
  );
}

function toMapboxPosition(coordinate: readonly [number, number]): [number, number] {
  return [coordinate[0], coordinate[1]];
}

const styles = StyleSheet.create({
  markerView: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerShell: {
    alignItems: 'center',
    gap: 6,
  },
  clusterMarker: {
    minWidth: 58,
    height: 58,
    borderRadius: 29,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
    borderWidth: 3,
    borderColor: designSystem.colors.white,
    shadowColor: designSystem.colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  clusterMarkerDark: {
    backgroundColor: designSystem.colors.warmDark,
    borderColor: designSystem.colors.whiteOverlayBorder,
  },
  clusterCount: {
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  clusterCountDark: {
    color: designSystem.colors.lime,
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
    shadowColor: designSystem.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceMarkerDefault: {
    backgroundColor: designSystem.colors.whiteGlassBright,
    borderColor: designSystem.colors.blackWash,
  },
  priceMarkerDark: {
    backgroundColor: designSystem.colors.darkOliveGlass,
    borderColor: designSystem.colors.whiteOverlayThin,
  },
  priceMarkerActive: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.darkGreen,
    transform: [{ scale: 1.1 }],
  },
  priceMarkerLabel: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '600',
  },
  priceMarkerStem: {
    width: 2,
    height: 12,
    backgroundColor: designSystem.colors.blackWash,
    marginTop: -1,
  },
  priceMarkerStemDark: {
    backgroundColor: designSystem.colors.whiteOverlayThin,
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
  routeWidgetThumbnailFrame: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: designSystem.colors.whiteBorder,
    backgroundColor: designSystem.colors.charcoal,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  routeWidgetThumbnailImage: {
    borderRadius: 21,
  },
  routeWidgetUserDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    marginTop: -1,
    backgroundColor: '#4f88e8',
    borderWidth: 3,
    borderColor: designSystem.colors.whiteOverlayBorder,
    shadowColor: designSystem.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailFallback: {
    flex: 1,
  },
  markerAccent: {
    backgroundColor: designSystem.colors.lime,
  },
  markerDark: {
    backgroundColor: designSystem.colors.ink,
  },
});
