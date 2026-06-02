import { Image as ExpoImage } from 'expo-image';
import { ArrowsOutSimple, MapPin, MapTrifold } from 'phosphor-react-native';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatWidgetGlassCard } from '@/components/wandr/friends/chat-widgets/chat-widget-glass-card';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FriendChatMessage } from '@/types/friends';

type RouteCard = NonNullable<FriendChatMessage['routeCard']>;

type RouteMapWidgetProps = {
  routeCard: RouteCard;
  createdAt: number;
};

const GOOGLE_MAP_WITHOUT_POI_STYLE = JSON.stringify([
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels', stylers: [{ visibility: 'off' }] },
]);

const routeWidgetTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZoneName: 'shortOffset',
});

function formatRouteWidgetTime(timestamp: number) {
  return routeWidgetTimeFormatter.format(new Date(timestamp)).replace(',', '');
}

export function RouteMapWidget({ routeCard, createdAt }: RouteMapWidgetProps) {
  const routeWidgetMarker =
    routeCard.mapMarkers.find((marker) => marker.status === 'active') ??
    routeCard.mapMarkers[0] ??
    null;
  const routeWidgetTitle = routeWidgetMarker?.label ?? routeCard.title;
  const mapCenter = routeWidgetMarker?.coordinate ?? routeCard.centerCoordinate;

  return (
    <View style={styles.routeMapWrap}>
      {mapCenter ? (
        <ExpoRouteMapPreview
          centerCoordinate={mapCenter}
          marker={routeWidgetMarker}
        />
      ) : routeCard.heroImageUri ? (
        <ExpoImage source={routeCard.heroImageUri} style={styles.routeHeroImage} contentFit="cover" />
      ) : (
        <View style={styles.routeMapFallback}>
          <MapTrifold color={designSystem.colors.background} size={24} weight="bold" />
        </View>
      )}

      <View style={styles.routeOverlay}>
        <View style={styles.routeOverlayTop}>
          <ChatWidgetGlassCard radius={999} style={styles.routePill}>
            <ThemedText style={styles.routePillText}>{formatRouteWidgetTime(createdAt)}</ThemedText>
          </ChatWidgetGlassCard>

          <ChatWidgetGlassCard radius={19} style={styles.routeExpandButton} contentStyle={styles.routeExpandContent}>
            <ArrowsOutSimple color={designSystem.colors.background} size={16} weight="bold" />
          </ChatWidgetGlassCard>
        </View>

        <ChatWidgetGlassCard radius={22} style={styles.routeInfoCard} contentStyle={styles.routeInfoContent}>
          <View style={styles.routeLocationRow}>
            <View style={styles.routeLocationCopy}>
              <MapPin color={designSystem.colors.background} size={15} weight="fill" />
              <ThemedText style={styles.routeTitle} numberOfLines={1}>
                {routeWidgetTitle}
              </ThemedText>
            </View>
            <ThemedText style={styles.routeDistanceText} numberOfLines={1}>
              {routeCard.distanceLabel}
            </ThemedText>
          </View>
          {routeCard.stopsPreview[0] ? (
            <ThemedText style={styles.routeStopPreview} numberOfLines={1}>
              {routeCard.stopsPreview[0]}
            </ThemedText>
          ) : null}
        </ChatWidgetGlassCard>
      </View>
    </View>
  );
}

function ExpoRouteMapPreview({
  centerCoordinate,
  marker,
}: {
  centerCoordinate: readonly [number, number];
  marker: RouteCard['mapMarkers'][number] | null;
}) {
  const expoMaps = getExpoMapsModule();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const cameraPosition = {
    coordinates: toExpoCoordinate(centerCoordinate),
    zoom: 13,
  };
  const markerCoordinates = marker ? toExpoCoordinate(marker.coordinate) : null;

  if (!expoMaps) {
    return (
      <View style={styles.routeMapFallback}>
        <MapTrifold color={designSystem.colors.background} size={22} weight="bold" />
      </View>
    );
  }

  if (Platform.OS === 'ios') {
    const { AppleMaps } = expoMaps;

    return (
      <AppleMaps.View
        style={StyleSheet.absoluteFill}
        cameraPosition={cameraPosition}
        markers={
          markerCoordinates
            ? [
                {
                  id: marker?.id,
                  coordinates: markerCoordinates,
                  title: marker?.label,
                  tintColor: designSystem.colors.lime,
                  systemImage: 'mappin.circle.fill',
                },
              ]
            : []
        }
        properties={{
          mapType: AppleMaps.MapType.STANDARD,
          pointsOfInterest: { including: [] },
          selectionEnabled: false,
          isTrafficEnabled: false,
        }}
        uiSettings={{
          compassEnabled: false,
          myLocationButtonEnabled: false,
          scaleBarEnabled: false,
          togglePitchEnabled: false,
        }}
      />
    );
  }

  if (Platform.OS === 'android') {
    const { GoogleMaps } = expoMaps;

    return (
      <GoogleMaps.View
        style={StyleSheet.absoluteFill}
        cameraPosition={cameraPosition}
        markers={
          markerCoordinates
            ? [
                {
                  id: marker?.id,
                  coordinates: markerCoordinates,
                  title: marker?.label,
                  showCallout: false,
                },
              ]
            : []
        }
        colorScheme={isDark ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.LIGHT}
        properties={{
          isBuildingEnabled: false,
          isIndoorEnabled: false,
          isMyLocationEnabled: false,
          isTrafficEnabled: false,
          mapStyleOptions: { json: GOOGLE_MAP_WITHOUT_POI_STYLE },
          mapType: GoogleMaps.MapType.NORMAL,
          selectionEnabled: false,
        }}
        uiSettings={{
          compassEnabled: false,
          indoorLevelPickerEnabled: false,
          mapToolbarEnabled: false,
          myLocationButtonEnabled: false,
          rotationGesturesEnabled: false,
          scrollGesturesEnabled: false,
          scrollGesturesEnabledDuringRotateOrZoom: false,
          tiltGesturesEnabled: false,
          zoomControlsEnabled: false,
          zoomGesturesEnabled: false,
          scaleBarEnabled: false,
          togglePitchEnabled: false,
        }}
      />
    );
  }

  return (
    <View style={styles.routeMapFallback}>
      <MapTrifold color={designSystem.colors.background} size={22} weight="bold" />
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getExpoMapsModule(): any {
  // expo-maps is not bundled in Expo Go — always returns null (falls back to image/icon).
  return null;
}

function toExpoCoordinate(coordinate: readonly [number, number]) {
  return {
    longitude: coordinate[0],
    latitude: coordinate[1],
  };
}

const styles = StyleSheet.create({
  routeMapWrap: {
    height: 164,
    backgroundColor: designSystem.colors.charcoal,
  },
  routeHeroImage: {
    width: '100%',
    height: '100%',
  },
  routeMapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.charcoal,
  },
  routeOverlay: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }),
    justifyContent: 'space-between',
    padding: 10,
  },
  routeOverlayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routePill: {
    alignSelf: 'flex-start',
  },
  routePillText: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    color: designSystem.colors.background,
  },
  routeExpandButton: {
    width: 30,
    height: 30,
  },
  routeExpandContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInfoCard: {
    borderRadius: 18,
    boxShadow: '0 6px 12px rgba(0,0,0,0.16)',
    elevation: 6,
  },
  routeInfoContent: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 2,
  },
  routeLocationRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  routeLocationCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  routeTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: designSystem.colors.background,
  },
  routeDistanceText: {
    maxWidth: 60,
    textAlign: 'right',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.darkTextMuted,
  },
  routeStopPreview: {
    marginLeft: 22,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    color: designSystem.colors.darkPlaceholderText,
  },
});
