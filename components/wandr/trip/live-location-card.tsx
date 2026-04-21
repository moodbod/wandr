import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import type { ExploreMapMarker } from '@/constants/explore-content';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type LiveLocationCardProps = {
  title?: string;
  subtitle?: string;
  centerCoordinate: readonly [number, number];
  userCoordinate?: readonly [number, number] | null;
  userHeading?: number | null;
  markers: readonly ExploreMapMarker[];
};

export function LiveLocationCard({
  title = 'Live Location',
  subtitle = 'Walvis Bay Coast',
  centerCoordinate,
  userCoordinate = null,
  userHeading = null,
  markers,
}: LiveLocationCardProps) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  return (
    <Pressable
      style={[styles.bentoCardMap, isDark && styles.bentoCardMapDark]}
      onPress={() => router.push('/trip/map')}
    >
      <View style={styles.bentoCardContent}>
        <ThemedText style={styles.bentoMapTitle}>{title}</ThemedText>
        <ThemedText style={[styles.bentoMapSubtitle, isDark && styles.bentoMapSubtitleDark]}>
          {subtitle}
        </ThemedText>
      </View>
      <View style={[styles.bentoMapBgContainer, isDark && styles.bentoMapBgContainerDark]}>
        <MapPreview
          centerCoordinate={centerCoordinate}
          userCoordinate={userCoordinate}
          userHeading={userHeading}
          markers={markers}
          zoomLevel={11}
          onMarkerPress={(marker) => {
            if (marker.experienceSlug) {
              router.push({ pathname: '/explore/[slug]', params: { slug: marker.experienceSlug } });
            }
          }}
        />
        <View style={styles.mapShade} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bentoCardMap: {
    backgroundColor: designSystem.colors.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.12)',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 320,
  },
  bentoCardMapDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorder,
  },
  bentoCardContent: {
    padding: 20,
    zIndex: 2,
    gap: 6,
  },
  bentoMapTitle: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  bentoMapSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
  bentoMapSubtitleDark: {
    color: designSystem.colors.darkMutedText,
  },
  bentoMapBgContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    top: 72,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.12)',
  },
  bentoMapBgContainerDark: {
    opacity: 0.92,
    borderColor: 'rgba(249,249,246,0.12)',
  },
  mapShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,15,12,0.28)',
  },
});
