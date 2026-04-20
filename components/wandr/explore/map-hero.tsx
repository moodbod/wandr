import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { WandrHeader } from '@/components/wandr/header';
import { MapPreview } from '@/components/wandr/mapbox/map-preview';
import { designSystem } from '@/constants/design-system';
import type { ExploreMapMarker } from '@/constants/explore-content';

type ExploreMapHeroProps = {
  locationLabel: string;
  centerCoordinate: readonly [number, number];
  markers: readonly ExploreMapMarker[];
  topInset?: number;
  onInteract?: () => void;
  onLocateMe?: () => void;
};

export function ExploreMapHero({
  locationLabel,
  centerCoordinate,
  markers,
  topInset = designSystem.spacing.xxxl,
  onInteract,
  onLocateMe,
}: ExploreMapHeroProps) {
  const router = useRouter();

  return (
    <View style={styles.shell}>
      <MapPreview
        centerCoordinate={centerCoordinate}
        markers={markers}
        zoomLevel={10.6}
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
