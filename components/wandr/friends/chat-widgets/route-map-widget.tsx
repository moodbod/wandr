import { Image as ExpoImage } from 'expo-image';
import { ArrowsOutSimple, MapPin, MapTrifold } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatWidgetGlassCard } from '@/components/wandr/friends/chat-widgets/chat-widget-glass-card';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { designSystem } from '@/constants/design-system';
import type { FriendChatMessage } from '@/types/friends';

type RouteCard = NonNullable<FriendChatMessage['routeCard']>;

type RouteMapWidgetProps = {
  routeCard: RouteCard;
  createdAt: number;
};

function formatRouteWidgetTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'shortOffset',
  })
    .format(new Date(timestamp))
    .replace(',', '');
}

export function RouteMapWidget({ routeCard, createdAt }: RouteMapWidgetProps) {
  const routeWidgetMarker =
    routeCard.mapMarkers.find((marker) => marker.status === 'active') ??
    routeCard.mapMarkers[0] ??
    null;
  const routeWidgetTitle = routeWidgetMarker?.label ?? routeCard.title;

  return (
    <View style={styles.routeMapWrap}>
      {routeWidgetMarker ? (
        <MapPreview
          centerCoordinate={routeWidgetMarker.coordinate}
          markers={[routeWidgetMarker]}
          zoomLevel={13.5}
          showRoutes={false}
          colorSchemeMode="dark"
          markerVariant="routeWidget"
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

const styles = StyleSheet.create({
  routeMapWrap: {
    height: 286,
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.background,
  },
  routeExpandButton: {
    width: 38,
    height: 38,
  },
  routeExpandContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInfoCard: {
    borderRadius: 22,
    shadowColor: designSystem.colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  routeInfoContent: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 5,
  },
  routeLocationRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  routeLocationCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  routeTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '600',
    color: designSystem.colors.background,
  },
  routeDistanceText: {
    maxWidth: 78,
    textAlign: 'right',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.darkTextMuted,
  },
  routeStopPreview: {
    marginLeft: 24,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.darkPlaceholderText,
  },
});
