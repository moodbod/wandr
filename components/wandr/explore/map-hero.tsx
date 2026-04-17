import { NavigationArrow } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { GlassButton } from '@/components/ui/glass-button';
import { MapPreview } from '@/components/wandr/mapbox/map-preview';
import { designSystem } from '@/constants/design-system';
import type { ExploreMapMarker } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ExploreMapHeroProps = {
  locationLabel: string;
  centerCoordinate: readonly [number, number];
  markers: ReadonlyArray<ExploreMapMarker>;
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.shell}>
      <MapPreview centerCoordinate={centerCoordinate} markers={markers} zoomLevel={10.6} onInteract={onInteract} />
      <View style={[styles.overlay, { marginTop: topInset, paddingTop: 24 }]} pointerEvents="box-none">
        <View style={styles.heroHeader} pointerEvents="box-none">
          <GlassButton onPress={onLocateMe} width={46} height={46}>
            <NavigationArrow color={isDark ? '#fff' : designSystem.colors.ink} weight="bold" size={20} />
          </GlassButton>
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
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
