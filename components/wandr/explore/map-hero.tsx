import { MapPin } from 'phosphor-react-native';
import { StyleSheet, View, Button } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MapPreview } from '@/components/wandr/mapbox/map-preview';
import { designSystem } from '@/constants/design-system';
import type { ExploreMapMarker } from '@/constants/explore-content';

type ExploreMapHeroProps = {
  locationLabel: string;
  centerCoordinate: readonly [number, number];
  markers: ReadonlyArray<ExploreMapMarker>;
  topInset?: number;
  onInteract?: () => void;
};

export function ExploreMapHero({
  locationLabel,
  centerCoordinate,
  markers,
  topInset = designSystem.spacing.xxxl,
  onInteract,
}: ExploreMapHeroProps) {
  return (
    <View style={styles.shell}>
      <MapPreview centerCoordinate={centerCoordinate} markers={markers} zoomLevel={10.6} onInteract={onInteract} />
      <View style={[styles.overlay, { paddingTop: topInset }]} pointerEvents="box-none">
        <View style={styles.heroCopy}>
          <View style={styles.nativeButtonContainer}>
            <Button title={locationLabel} onPress={() => {}} />
          </View>
        </View>
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
  heroCopy: {
    maxWidth: 240,
  },
  nativeButtonContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8, // Standard iOS button container radius
  },
});
