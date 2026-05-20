import { useRouter } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { WandrHeader } from '@/components/wandr/header';
import { HeaderLocationSelector } from '@/components/wandr/header-location-selector';
import { MapFrame } from '@/components/wandr/maps/map-frame';
import type { MapMarker } from '@/components/wandr/maps/map-preview';
import { designSystem } from '@/constants/design-system';
import type { ExploreMapMarker } from '@/constants/explore-content';
import { type PlanningLocation } from '@/constants/planning-countries';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';

type ExploreMapHeroProps = {
  locationLabel: string;
  centerCoordinate: readonly [number, number];
  userCoordinate?: readonly [number, number] | null;
  userHeading?: number | null;
  viewportPadding?: {
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
  };
  markers: readonly ExploreMapMarker[];
  routeCoordinates?: readonly (readonly [number, number])[];
  showRoutes?: boolean;
  recenterToUserSignal?: number;
  topInset?: number;
  onInteract?: () => void;
  onLocateMe?: () => void;
  onMarkerPress?: (marker: MapMarker) => void;
  onOpenLocationSheet?: () => void;
  planningLocation?: PlanningLocation;
  showBackButton?: boolean;
  hideHeader?: boolean;
  mapPersistKey?: string;
  shellStyle?: StyleProp<ViewStyle>;
};

export function ExploreMapHero({
  locationLabel,
  centerCoordinate,
  userCoordinate = null,
  userHeading = null,
  viewportPadding,
  markers,
  routeCoordinates,
  showRoutes = true,
  recenterToUserSignal,
  topInset = designSystem.spacing.xxxl,
  onInteract,
  onLocateMe,
  onMarkerPress,
  onOpenLocationSheet,
  planningLocation,
  showBackButton = false,
  hideHeader = false,
  mapPersistKey,
  shellStyle,
}: ExploreMapHeroProps) {
  const router = useRouter();
  const traveler = useCurrentTraveler();

  return (
    <MapFrame
      shellStyle={[styles.shell, shellStyle]}
        centerCoordinate={centerCoordinate}
        userCoordinate={userCoordinate}
        userAvatarPaletteKey={traveler?.slug}
        userAvatarUri={traveler?.avatarUri}
        userHeading={userHeading}
        userName={traveler?.name}
        viewportPadding={viewportPadding}
        markers={markers}
        routeCoordinates={routeCoordinates}
        zoomLevel={14}
        showRoutes={showRoutes}
        persistKey={mapPersistKey}
        recenterToUserSignal={recenterToUserSignal}
        onInteract={onInteract}
        onMarkerPress={(marker) => {
          if (onMarkerPress) {
            onMarkerPress(marker);
            return;
          }

          if (marker.itemKind === 'stay' && marker.experienceSlug) {
            router.push({ pathname: '/stays/details', params: { slug: marker.experienceSlug } });
            return;
          }

          if (marker.itemKind === 'hiddenGem' && marker.experienceSlug) {
            router.push({ pathname: '/explore/hidden-gems/[slug]', params: { slug: marker.experienceSlug } });
            return;
          }

          if (marker.experienceSlug) {
            router.push({ pathname: '/explore/[slug]', params: { slug: marker.experienceSlug } });
          }
        }}
    >
      {!hideHeader && (
        <WandrHeader
          config={{
            overlay: true,
            leadingAction: showBackButton
              ? { kind: 'back', accessibilityLabel: 'Go back' }
              : undefined,
            trailingActions: onLocateMe
              ? [{ kind: 'locate' as const, accessibilityLabel: 'Locate me', onPress: onLocateMe }]
              : undefined,
          }}
          leadingContent={
            planningLocation && onOpenLocationSheet ? (
              <HeaderLocationSelector location={planningLocation} onPress={onOpenLocationSheet} />
            ) : undefined
          }
        />
      )}
      <View style={[styles.overlay, { marginTop: topInset, paddingTop: 18 }]} pointerEvents="box-none">
        <View style={styles.heroHeader} pointerEvents="none" />
      </View>
    </MapFrame>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: designSystem.colors.mapFallback,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
