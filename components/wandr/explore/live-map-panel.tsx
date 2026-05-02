import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { MapFrame } from '@/components/wandr/maps/map-frame';
import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import type { ExploreMapMarker } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ExploreLiveMapPanelProps = {
  title: string;
  description: string;
  ctaLabel: string;
  centerCoordinate: readonly [number, number];
  markers: readonly ExploreMapMarker[];
};

export function ExploreLiveMapPanel({
  title,
  description,
  ctaLabel,
  centerCoordinate,
  markers,
}: ExploreLiveMapPanelProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const featuredMarker = markers.find((marker) => marker.experienceSlug);

  return (
    <MapFrame
      shellStyle={styles.shell}
        centerCoordinate={centerCoordinate}
        markers={markers}
        zoomLevel={14}
        onMarkerPress={(marker) => {
          if (marker.experienceSlug) {
            router.push({ pathname: '/explore/[slug]', params: { slug: marker.experienceSlug } });
          }
        }}
    >
      <View
        style={[
          styles.overlayCardContainer,
          { borderColor: isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft },
        ]}>
        <BlurView 
          intensity={80} 
          tint={isDark ? 'dark' : 'light'} 
          style={[
            styles.overlayCard,
            { backgroundColor: isDark ? designSystem.colors.darkGlassHeader : designSystem.colors.whiteOverlayFaint },
          ]}
        >
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText 
            style={styles.description}
            lightColor={designSystem.colors.warmDark}
            darkColor={designSystem.colors.darkMutedText}
          >
            {description}
          </ThemedText>
          <Pressable
            style={styles.cta}
            onPress={() => {
              if (featuredMarker?.experienceSlug) {
                router.push({ pathname: '/explore/[slug]', params: { slug: featuredMarker.experienceSlug } });
              }
            }}
          >
            <ThemedText style={styles.ctaLabel}>{ctaLabel}</ThemedText>
          </Pressable>
        </BlurView>
      </View>
    </MapFrame>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 400,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: designSystem.colors.liveMapPanel,
    position: 'relative',
  },
  overlayCardContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  overlayCard: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  cta: {
    marginTop: 10,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.lime,
    paddingHorizontal: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaLabel: {
    fontSize: 13,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
});
