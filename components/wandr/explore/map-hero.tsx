import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { HeaderLocationSelector } from '@/components/wandr/header-location-selector';
import { MapFrame } from '@/components/wandr/maps/map-frame';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import type { ExploreMapMarker } from '@/constants/explore-content';
import { type PlanningLocation } from '@/constants/planning-countries';

type ExploreMapHeroProps = {
  locationLabel: string;
  centerCoordinate: readonly [number, number];
  userCoordinate?: readonly [number, number] | null;
  userHeading?: number | null;
  markers: readonly ExploreMapMarker[];
  routeCoordinates?: readonly (readonly [number, number])[];
  showRoutes?: boolean;
  topInset?: number;
  onInteract?: () => void;
  onLocateMe?: () => void;
  onOpenLocationSheet?: () => void;
  planningLocation?: PlanningLocation;
  showBackButton?: boolean;
};

export function ExploreMapHero({
  locationLabel,
  centerCoordinate,
  userCoordinate = null,
  userHeading = null,
  markers,
  routeCoordinates,
  showRoutes = true,
  topInset = designSystem.spacing.xxxl,
  onInteract,
  onLocateMe,
  onOpenLocationSheet,
  planningLocation,
  showBackButton = false,
}: ExploreMapHeroProps) {
  const router = useRouter();

  return (
    <MapFrame
      shellStyle={styles.shell}
        centerCoordinate={centerCoordinate}
        userCoordinate={userCoordinate}
        userHeading={userHeading}
        markers={markers}
        routeCoordinates={routeCoordinates}
        zoomLevel={14}
        showRoutes={showRoutes}
        onInteract={onInteract}
        onMarkerPress={(marker) => {
          if (marker.itemKind === 'stay' && marker.experienceSlug) {
            router.push({ pathname: '/stays/details', params: { slug: marker.experienceSlug } });
            return;
          }

          if (marker.experienceSlug) {
            router.push({ pathname: '/explore/[slug]', params: { slug: marker.experienceSlug } });
          }
        }}
    >
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
      <View style={[styles.overlay, { marginTop: topInset, paddingTop: 18 }]} pointerEvents="box-none">
        <View style={styles.heroHeader} pointerEvents="none" />
      </View>
    </MapFrame>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: '100%',
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
