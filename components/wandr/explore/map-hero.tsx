import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { WandrHeader } from '@/components/wandr/header';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { designSystem } from '@/constants/design-system';
import type { ExploreMapMarker } from '@/constants/explore-content';

type ExploreMapHeroProps = {
  locationLabel: string;
  centerCoordinate: readonly [number, number];
  userCoordinate?: readonly [number, number] | null;
  userHeading?: number | null;
  markers: readonly ExploreMapMarker[];
  topInset?: number;
  onInteract?: () => void;
  onLocateMe?: () => void;
  showBackButton?: boolean;
};

export function ExploreMapHero({
  locationLabel,
  centerCoordinate,
  userCoordinate = null,
  userHeading = null,
  markers,
  topInset = designSystem.spacing.xxxl,
  onInteract,
  onLocateMe,
  showBackButton = false,
}: ExploreMapHeroProps) {
  const router = useRouter();

  return (
    <View style={styles.shell}>
      <MapPreview
        centerCoordinate={centerCoordinate}
        userCoordinate={userCoordinate}
        userHeading={userHeading}
        markers={markers}
        zoomLevel={11.4}
        onInteract={onInteract}
        onMarkerPress={(marker) => {
          if (marker.experienceSlug) {
            router.push({ pathname: '/explore/[slug]', params: { slug: marker.experienceSlug } });
          }
        }}
      />
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
      />
      <View style={[styles.overlay, { marginTop: topInset, paddingTop: 24 }]} pointerEvents="box-none">
        <View style={styles.heroHeader} pointerEvents="none" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#eeeeeb',
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
