import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { MapFrame } from '@/components/wandr/maps/map-frame';
import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import type { ExploreMapMarker } from '@/constants/explore-content';
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
  subtitle,
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
        {subtitle ? (
          <ThemedText style={[styles.bentoMapSubtitle, isDark && styles.bentoMapSubtitleDark]}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <MapFrame
        shellStyle={[styles.bentoMapBgContainer, isDark && styles.bentoMapBgContainerDark]}
          centerCoordinate={centerCoordinate}
          userCoordinate={userCoordinate}
          userHeading={userHeading}
          markers={markers}
          zoomLevel={14}
          onMarkerPress={(marker) => {
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
        <View style={styles.mapShade} />
      </MapFrame>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bentoCardMap: {
    backgroundColor: designSystem.colors.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: designSystem.colors.border,
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
    fontWeight: '600',
  },
  bentoMapSubtitle: {
    fontSize: 14,
    fontWeight: '600',
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
    borderColor: designSystem.colors.border,
  },
  bentoMapBgContainerDark: {
    opacity: 0.92,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  mapShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: designSystem.colors.scrimSoft,
  },
});
